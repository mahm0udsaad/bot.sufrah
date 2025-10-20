"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MessageSquare, Phone, Shield } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"

export default function SignInPage() {
  const [step, setStep] = useState<"phone" | "verify">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [messageKey, setMessageKey] = useState<string | null>(null)

  const { signIn, verifyCode } = useAuth()
  const router = useRouter()
  const { t, dir } = useI18n()
  const isRtl = dir === "rtl"

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessageKey(null)

    const result = await signIn(phone)

    if (result.success) {
      setStep("verify")
      setMessageKey("signin.alerts.codeSent")
    } else {
      setError(result.message)
    }

    setLoading(false)
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await verifyCode(phone, code)

    if (result.success) {
      router.push("/")
    } else {
      setError(result.message)
    }

    setLoading(false)
  }

  const handleResendCode = async () => {
    setLoading(true)
    const result = await signIn(phone)
    if (result.success) {
      setMessageKey("signin.alerts.codeResent")
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-balance">{t("signin.header.title")}</h1>
          <p className="text-muted-foreground text-pretty">{t("signin.header.subtitle")}</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {step === "phone" ? t("signin.card.phoneStep.title") : t("signin.card.verifyStep.title")}
            </CardTitle>
            <CardDescription>
              {step === "phone"
                ? t("signin.card.phoneStep.description")
                : t("signin.card.verifyStep.description", { values: { phone } })}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {messageKey && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>{t(messageKey)}</AlertDescription>
              </Alert>
            )}

            {step === "phone" ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("signin.form.phone.label")}</Label>
                  <div className="relative">
                    <Phone
                      className={cn(
                        "absolute top-3 h-4 w-4 text-muted-foreground",
                        isRtl ? "right-3" : "left-3",
                      )}
                    />
                    <Input
                      id="phone"
                      type="tel"
                      dir={dir}
                      placeholder={t("signin.form.phone.placeholder")}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={cn(isRtl ? "pr-10 text-right" : "pl-10")}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("signin.form.phone.helper")}</p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("signin.actions.sending")}
                    </>
                  ) : (
                    t("signin.actions.sendCode")
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">{t("signin.form.code.label")}</Label>
                  <Input
                    id="code"
                    type="text"
                    dir="ltr"
                    placeholder={t("signin.form.code.placeholder")}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    required
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {t("signin.form.code.helper", { values: { phone } })}
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("signin.actions.verifying")}
                    </>
                  ) : (
                    t("signin.actions.verify")
                  )}
                </Button>

                <div className="text-center space-y-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("phone")}
                    disabled={loading}
                  >
                    {t("signin.actions.changePhone")}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={loading}
                  >
                    {t("signin.actions.resend")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          {t("signin.footer.terms")}
        </div>
      </div>
    </div>
  )
}
