## تحديث مخطط قاعدة البيانات (Prisma) المطلوب — 2025-10-16

### الملخص
- **إضافة قيم افتراضية للمعرّفات** باستخدام `@default(cuid())` في نماذج: `User`, `Restaurant`, `OrderItem`, `Template`, `UsageLog`.
- **تحديث الحقول الزمنية** بإضافة `@updatedAt` إلى: `User.updated_at`, `Restaurant.updatedAt`, `Template.updated_at`.
- هذا يضمن أن الإنشاءات الأولى لا تفشل بسبب غياب `id`، وأن تحديثات السجلات تُحدّث الطابع الزمني تلقائيًا.

### التغييرات الدقيقة على `schema.prisma`
التعريفات التالية تعبّر عن الحالة النهائية المطلوبة بعد التعديل (مقتطفات فقط):

```prisma
model User {
  id                        String   @id @default(cuid())
  phone                     String   @unique
  // ...
  created_at                DateTime @default(now())
  updated_at                DateTime @updatedAt
}

model Restaurant {
  id                 String   @id @default(cuid())
  userId             String   @unique @map("user_id")
  // ...
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
}

model OrderItem {
  id         String @id @default(cuid())
  // ...
}

model Template {
  id           String   @id @default(cuid())
  // ...
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
}

model UsageLog {
  id                String     @id @default(cuid())
  restaurant_id     String
  action            String
  details           Json?      @default("{}")
  created_at        DateTime   @default(now())
  RestaurantProfile Restaurant @relation(fields: [restaurant_id], references: [id], onDelete: Cascade)
}
```

ملاحظة: `@default(cuid())` قيمة افتراضية على مستوى Prisma Client (وليس قاعدة البيانات)، لذلك غالبًا لن ينتج عنها تغييرات DDL في PostgreSQL.

### ملاحظة مهمة بخصوص `UsageLog`
لوحظ خطأ أثناء الاستدعاء: `prisma.usageLog.create` باستخدام `restaurantId`. الحقل في المخطط هو `restaurant_id` (snake_case)، لذا هناك خياران:
- **الخيار A (تعديل الكود):** استخدام `restaurant_id` عند الإنشاء:
  ```ts
  await prisma.usageLog.create({
    data: { restaurant_id: restaurantId, action: "user_signin", details: {} },
  })
  ```
- **الخيار B (تعديل المخطط لمواءمة الكود):** إعادة تسمية الحقل إلى camelCase مع الإبقاء على اسم العمود في قاعدة البيانات:
  ```prisma
  model UsageLog {
    id                String     @id @default(cuid())
    restaurantId      String     @map("restaurant_id")
    action            String
    details           Json?      @default("{}")
    created_at        DateTime   @default(now())
    RestaurantProfile Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  }
  ```
  بعد هذا التغيير يجب تحديث الكود إلى `restaurantId` (وهو متوافق مع الاستخدام الحالي).

### ملاحظات حول مشكلة الظل (Shadow DB) أثناء الهجرة
خلال تجربة `prisma migrate dev` ظهر الخطأ `P3006` متعلق بالعمود: `twilioSubaccountSid`.
- يرجى مراجعة خرائط الحقول في `RestaurantBot` والتأكد من أن أسماء الأعمدة المعينة عبر `@map()` تطابق الموجودة فعليًا في قاعدة البيانات.
- إذا كان العمود في قاعدة البيانات باسم snake_case (مثل `twilio_subaccount_sid`) فأحد الحلول:
  - إما تعديل الـ `@map("twilio_subaccount_sid")` في المخطط.
  - أو تعديل اسم العمود فعليًا في قاعدة البيانات ليطابق الخريطة الحالية.
- إن تعذّر تطبيق الهجرة بسبب الـ Shadow DB، يمكن مؤقتًا استخدام `prisma db push` للمزامنة غير المهاجرة، ثم تسوية تاريخ الهجرات لاحقًا.

### خطوات التنفيذ (Backend)
1) اسحب آخر التعديلات من المستودع.
2) راجع/طبّق تعديلات `schema.prisma` أعلاه.
3) ثبّت الاعتمادات ثم ولّد العميل:
   ```bash
   pnpm i
   npx prisma generate
   ```
4) طبّق الهجرة (إن أمكن):
   ```bash
   npx prisma migrate dev --name default_ids_and_updated_at
   ```
   - في حال ظهور `P3006` بسبب خرائط أعمدة غير متطابقة، أصلِح الخرائط أولًا كما في القسم أعلاه، أو استخدم:
   ```bash
   npx prisma db push
   ```
5) تأكّد من أن أي إنشاءات في الكود لا ترسل `id` يدويًا لهذه النماذج.
6) عالج نقطة `UsageLog` إما بتعديل الكود لاستخدام `restaurant_id` أو بتعديل المخطط لاستخدام `restaurantId @map("restaurant_id")`.

### خطة اختبار سريعة
- إنشاء مستخدم لأول مرة عبر مسار التسجيل/التحقق: يجب أن يتم الإنشاء دون أخطاء `id` مفقود.
- التحقق من تحديث حقول الوقت: عند تعديل المستخدم/المطعم، يجب أن تتحدّث حقول `updated_at/updatedAt` تلقائيًا.
- إنشاء سجل `UsageLog`: تأكد أنه يُنشأ بنجاح بالحقل الصحيح (`restaurant_id` أو `restaurantId` حسب القرار).

### أسئلة أو متابعات
في حال وجود اختلاف بين أسماء الأعمدة الفعلية وأسماء الحقول في `@map()`, يُرجى مشاركتها ليتم توحيدها نهائيًا وتوليد هجرة سليمة.


