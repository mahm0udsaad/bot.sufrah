const ar = {
  common: {
    brand: {
      defaultName: "سفرة بوت",
    },
    languageSwitcher: {
      english: "الإنجليزية",
      arabic: "العربية",
      toggleLabel: "تغيير اللغة",
    },
    actions: {
      save: "حفظ",
      cancel: "إلغاء",
      edit: "تحرير",
      delete: "حذف",
      confirm: "تأكيد",
      back: "رجوع",
      close: "إغلاق",
      apply: "تطبيق",
      search: "بحث",
    },
    status: {
      loading: "جاري التحميل",
      empty: "لا توجد بيانات",
    },
    notifications: {
      success: "تمت العملية بنجاح",
      error: "حدث خطأ ما",
    },
  },
  navigation: {
    dashboard: "لوحة التحكم",
    chats: "المحادثات",
    orders: "الطلبات",
    ratings: "التقييمات",
    catalog: "القائمة",
    botManagement: "إدارة البوت",
    logs: "السجلات",
    usage: "الاستخدام والخطة",
    templates: "القوالب",
    settings: "الإعدادات",
    adminBots: "بوتات المشرف",
    adminSection: "المشرف",
    searchPlaceholder: "ابحث في المحادثات...",
  },
  dashboard: {
    overview: {
      title: "لوحة التحكم",
      subtitle: "تابع أداء بوت واتساب لديك وتابع استخدام حصة الرسائل",
      stats: {
        activeChats: {
          title: "المحادثات النشطة",
          description: "نشطة حالياً",
        },
        ordersToday: {
          title: "طلبات اليوم",
          description: "طلبات جديدة اليوم",
        },
        messagesToday: {
          title: "رسائل اليوم",
          description: "مرسلة ومستقبلة",
        },
        activeTemplates: {
          title: "القوالب النشطة",
          description: "قوالب معتمدة",
        },
      },
      usage: {
        title: "نظرة على الاستخدام",
        cta: "ترقية الخطة",
        summary: "تم استخدام {used} من أصل {limit} رسالة",
        currentCycle: "استهلاك الدورة الحالية",
        resets: "يعاد التعيين خلال {days} يوم",
        remaining: "متبقي {count}",
      },
      windows: {
        title: "نوافذ ٢٤ ساعة والحالة",
        activeConversations: "المحادثات النشطة",
        openConversations: "{count} مفتوحة",
        messagesToday: "رسائل اليوم",
        messagesCount: "{count} مرسلة",
        alert: {
          title: "تنبيه!",
          body: "استخدمت {percentage}% من حصة الرسائل الخاصة بك",
        },
      },
      activity: {
        title: "النشاط اليومي (٧ أيام)",
        subtitle: "الرسائل والطلبات مع مرور الوقت",
        legend: {
          messages: "الرسائل",
          orders: "الطلبات",
        },
        days: {
          mon: "الإثنين",
          tue: "الثلاثاء",
          wed: "الأربعاء",
          thu: "الخميس",
          fri: "الجمعة",
          sat: "السبت",
          sun: "الأحد",
        },
      },
      templates: {
        title: "استخدام القوالب",
        subtitle: "أكثر القوالب استخداماً هذا الأسبوع",
        fallback: {
          welcome: "رسالة الترحيب",
          confirmation: "تأكيد الطلب",
          delivery: "تحديث التوصيل",
          menu: "طلب القائمة",
          payment: "رابط الدفع",
        },
      },
      ordersSnapshot: {
        title: "ملخص الطلبات",
        subtitle: "نظرة على حالات الطلب الحالية",
        pending: "قيد الانتظار",
        preparing: "قيد التحضير",
        ready: "جاهز",
        delivered: "تم التسليم",
      },
    },
  },
  signin: {
    header: {
      title: "مرحباً بك في سفرة بوت",
      subtitle: "سجّل الدخول لإدارة نظام الطلب عبر واتساب",
    },
    card: {
      phoneStep: {
        title: "تسجيل الدخول",
        description: "أدخل رقم هاتفك للبدء",
      },
      verifyStep: {
        title: "تأكيد الهاتف",
        description: "أدخل رمز التحقق المرسل إلى {phone}",
      },
    },
    alerts: {
      codeSent: "تم إرسال رمز التحقق إلى هاتفك",
      codeResent: "تم إرسال رمز تحقق جديد",
    },
    form: {
      phone: {
        label: "رقم الهاتف",
        placeholder: "+966 5X XXX XXXX",
        helper: "يرجى تضمين مفتاح الدولة (مثال: +966 للسعودية)",
      },
      code: {
        label: "رمز التحقق",
        placeholder: "123456",
        helper: "تم إرسال الرمز إلى {phone}",
      },
    },
    actions: {
      sendCode: "إرسال رمز التحقق",
      sending: "جاري الإرسال...",
      verify: "تأكيد الدخول",
      verifying: "جاري التحقق...",
      changePhone: "تغيير رقم الهاتف",
      resend: "إعادة إرسال الرمز",
    },
    footer: {
      terms: "بتسجيل الدخول، فإنك توافق على شروط الخدمة وسياسة الخصوصية",
    },
  },
  orders: {
    header: {
      title: "الطلبات",
      subtitle: "تابع طلبات واتساب مباشرة وتابع تنفيذها",
    },
    actions: {
      export: "تصدير",
      viewDetails: "عرض تفاصيل الطلب",
    },
    filters: {
      statusPlaceholder: "تصفية حسب الحالة",
      allStatuses: "جميع الحالات",
      searchPlaceholder: "ابحث بالعميل أو برقم الهاتف أو رقم الطلب",
    },
    metrics: {
      todaysOrders: { title: "طلبات اليوم" },
      revenue: { title: "الإيرادات" },
      avgValue: { title: "متوسط قيمة الطلب" },
      completionRate: { title: "نسبة الإكمال" },
    },
    table: {
      title: "الطلبات",
      subtitle: "مفلترة بحسب محادثات واتساب",
      columns: {
        order: "رقم الطلب",
        customer: "العميل",
        status: "الحالة",
        payment: "الدفع",
        total: "الإجمالي",
        placed: "وقت الإنشاء",
        actions: "إجراءات",
      },
      updateStatusPlaceholder: "تحديث الحالة",
      walkIn: "عميل حضوري",
      noPhone: "لا يوجد رقم هاتف",
      empty: "لا توجد طلبات مطابقة للفلاتر الحالية.",
    },
    dialog: {
      title: "طلب {id}",
      viewPaymentLink: "عرض رابط الدفع",
      itemsTitle: "العناصر",
      itemQuantity: "الكمية {qty}",
      total: "الإجمالي",
      payment: {
        title: "معلومات الدفع",
        status: "الحالة",
        method: "طريقة الدفع",
        transaction: "رقم العملية",
      },
    },
    loading: {
      updating: "جاري تحديث الطلب...",
    },
    toasts: {
      loadFailed: "تعذر تحميل الطلبات",
      statusUpdated: "تم تحديث حالة الطلب في الوقت الفعلي",
      statusChangeSuccess: "تم تحديث حالة الطلب {id}",
      updateFailed: "تعذر تحديث حالة الطلب",
    },
    status: {
      draft: "مسودة",
      confirmed: "مؤكد",
      preparing: "قيد التحضير",
      outForDelivery: "في طريق التسليم",
      delivered: "تم التسليم",
      cancelled: "ملغي",
    },
    paymentStatus: {
      pending: "قيد الانتظار",
      paid: "مدفوع",
      failed: "فشل",
      refunded: "مسترد",
    },
  },
  catalog: {
    header: {
      title: "القائمة",
      subtitle: "إدارة المنتجات والفئات والفروع",
    },
    categories: {
      title: "الفئات",
      empty: "لا توجد فئات",
    },
    products: {
      title: "المنتجات",
      count: "{count} منتج",
      fallbackName: "منتج",
      noDescription: "لا يوجد وصف",
      emptyTitle: "لا توجد منتجات",
      emptySubtitle: "اختر فئة لعرض المنتجات",
    },
    badges: {
      delivery: "توصيل",
      pickup: "استلام",
      dineIn: "تناول في المطعم",
      car: "سيارة",
    },
    branches: {
      title: "الفروع",
      count: "{count} فرع",
      fallbackName: "فرع",
      noAddress: "لا يوجد عنوان",
      emptyTitle: "لا توجد فروع",
      emptySubtitle: "أضف أول فرع لديك",
    },
  },
  ratings: {
    header: {
      title: "تقييمات العملاء",
      subtitle: "تابع آراء العملاء وحلل الاتجاهات",
    },
    actions: {
      export: "تصدير",
      viewDetails: "عرض تفاصيل التقييم",
    },
    filters: {
      placeholder: "تصفية حسب التقييم",
      options: {
        all: "جميع التقييمات",
        five: "٥ نجوم",
        four: "٤ نجوم",
        three: "٣ نجوم",
        two: "٢ نجمة",
        one: "١ نجمة",
      },
    },
    metrics: {
      total: { title: "إجمالي التقييمات" },
      average: { title: "متوسط التقييم" },
      positive: { title: "التقييمات الإيجابية", hint: "٤-٥ نجوم" },
      negative: { title: "التقييمات المنخفضة", hint: "١-٣ نجوم" },
    },
    distribution: {
      title: "توزيع التقييمات",
      entry: "{count} ({percentage}٪)",
    },
    table: {
      title: "أحدث التقييمات",
      subtitle: "تعليقات ومراجعات العملاء",
      searchPlaceholder: "ابحث بالعميل أو بالملاحظة",
      columns: {
        customer: "العميل",
        rating: "التقييم",
        comment: "التعليق",
        orderType: "نوع الطلب",
        total: "الإجمالي",
        date: "التاريخ",
        actions: "إجراءات",
      },
      guest: "ضيف",
      phoneMasked: "***{lastDigits}",
      noValueShort: "—",
      ratingOutOf: "{rating}/5",
      noComment: "لا يوجد تعليق",
      empty: "لا توجد تقييمات مطابقة للفلاتر الحالية.",
    },
    dialog: {
      title: "تفاصيل التقييم",
      summary: {
        customerRating: "تقييم العميل",
        outOf: "من 5",
        commentTitle: "تعليق العميل",
      },
      customer: {
        name: "اسم العميل",
        phone: "رقم الهاتف",
        orderType: "نوع الطلب",
        paymentMethod: "طريقة الدفع",
        branch: "الفرع",
      },
      timeline: {
        title: "الجدول الزمني",
        placed: "تم إنشاء الطلب",
        requested: "تم طلب التقييم",
        submitted: "تم إرسال التقييم",
      },
      items: {
        title: "عناصر الطلب",
        quantity: "الكمية: {qty}",
        unitPrice: "{price} لكل وحدة",
      },
      total: "المبلغ الإجمالي",
    },
    toasts: {
      loadFailed: "تعذر تحميل التقييمات",
      detailFailed: "تعذر تحميل تفاصيل التقييم",
    },
  },
  templates: {
    header: {
      title: "قوالب واتساب",
      subtitle: "إدارة القوالب المعتمدة وطلبات الاعتماد",
    },
    actions: {
      create: "إنشاء قالب",
      submit: "إرسال للاعتماد",
      cancel: "إلغاء",
      creating: "جارٍ الإنشاء...",
      copy: "نسخ",
      edit: "تعديل",
      delete: "حذف",
      confirmDelete: "هل أنت متأكد من حذف هذا القالب؟",
    },
    status: {
      draft: "مسودة",
      pending: "قيد المراجعة",
      approved: "معتمد",
      rejected: "مرفوض",
    },
    stats: {
      total: "إجمالي القوالب",
      approved: "المعتمدة",
      pending: "قيد المراجعة",
      totalUsage: "إجمالي الاستخدام",
    },
    filters: {
      searchPlaceholder: "ابحث في القوالب...",
      categoryPlaceholder: "اختر الفئة",
      allCategories: "جميع الفئات",
    },
    categories: {
      greeting: "ترحيب",
      order: "طلب",
      delivery: "توصيل",
      menu: "قائمة",
      payment: "دفع",
      support: "دعم",
    },
    form: {
      dialogTitle: "إنشاء قالب جديد",
      name: {
        label: "اسم القالب *",
        placeholder: "أدخل اسم القالب",
      },
      category: {
        label: "الفئة *",
        placeholder: "اختر الفئة",
      },
      headerType: {
        label: "نوع العنوان (اختياري)",
        placeholder: "اختر نوع العنوان",
      },
      headerContent: {
        label: "محتوى العنوان",
        placeholder: "أدخل محتوى العنوان",
      },
      body: {
        label: "محتوى الرسالة *",
        placeholder: "أدخل نص القالب...",
        helper: "استخدم {{variable_name}} للمحتوى الديناميكي",
      },
      footer: {
        label: "النص الختامي (اختياري)",
        placeholder: "أدخل النص الختامي",
      },
      headerTypes: {
        text: "نص",
        image: "صورة",
        document: "مستند",
        video: "فيديو",
      },
      variables: {
        title: "المتغيرات المكتشفة:",
        heading: "المتغيرات:",
      },
    },
    usage: {
      used: "استخدم {count} مرة",
    },
    empty: {
      title: "لا توجد قوالب",
      searchMessage: "جرّب تعديل البحث أو عوامل التصفية",
      defaultMessage: "أنشئ أول قالب للبدء",
    },
    errors: {
      requiredFields: "يرجى تعبئة الحقول المطلوبة",
      createFailed: "فشل إنشاء القالب",
      network: "حدث خطأ في الاتصال",
    },
  },
} as const

export default ar
