"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Upload, CheckCircle, ArrowRight, ArrowLeft, Sparkles, MessageSquare, Shield, Zap } from "lucide-react"

const steps = [
  { id: 1, title: "Business Basics", description: "Restaurant information and contact details" },
  { id: 2, title: "Meta Account", description: "Connect Facebook Business or upload documents" },
  { id: 3, title: "WhatsApp Number", description: "Setup your WhatsApp Business number" },
  { id: 4, title: "Display Name", description: "Configure your business display name" },
  { id: 5, title: "Templates", description: "Setup message templates for orders" },
  { id: 6, title: "Menu & Delivery", description: "Configure menu and delivery settings" },
  { id: 7, title: "Payments", description: "Setup payment methods (optional)" },
  { id: 8, title: "Compliance", description: "Anti-ban settings and safety measures" },
  { id: 9, title: "Activate Bot", description: "Final review and bot activation" },
]

const Restaurant = "Sufrah Restaurant" // Declare the Restaurant variable

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({})
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCompletedSteps((prev) => [...prev, currentStep])
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BusinessBasicsStep />
      case 2:
        return <MetaAccountStep />
      case 3:
        return <WhatsAppNumberStep />
      case 4:
        return <DisplayNameStep />
      case 5:
        return <TemplatesStep />
      case 6:
        return <MenuDeliveryStep />
      case 7:
        return <PaymentsStep />
      case 8:
        return <ComplianceStep />
      case 9:
        return <ActivateBotStep />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Sufrah Setup</h1>
                <p className="text-sm text-muted-foreground">WhatsApp Bot Configuration</p>
              </div>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              Step {currentStep} of {steps.length}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-12 py-6">
        <div className="flex justify-center gap-8">
          {/* Main Content */}
          <div className="flex-1 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-2xl font-bold text-foreground">{steps[currentStep - 1].title}</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                      {steps[currentStep - 1].description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">{renderStepContent()}</CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2 bg-transparent"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{currentStep}</span>
                <span>/</span>
                <span>{steps.length}</span>
              </div>

              <Button
                onClick={nextStep}
                disabled={currentStep === steps.length}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              >
                {currentStep === steps.length ? "Complete Setup" : "Next Step"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="w-80 sticky top-24 h-fit">
            <div className="bg-card/50 backdrop-blur-sm border rounded-lg p-6">
              <h3 className="font-semibold mb-4 text-center">Setup Progress</h3>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div
                      className={`
                      relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 flex-shrink-0
                      ${
                        currentStep === step.id
                          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : completedSteps.includes(step.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-background text-muted-foreground"
                      }
                    `}
                    >
                      {completedSteps.includes(step.id) ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-medium">{step.id}</span>
                      )}
                      {currentStep === step.id && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-primary"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${currentStep === step.id ? "text-primary" : "text-foreground"}`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`
                        absolute left-[15px] mt-8 w-0.5 h-6 transition-colors duration-300
                        ${completedSteps.includes(step.id) ? "bg-primary" : "bg-muted-foreground/30"}
                      `}
                        style={{ marginLeft: "15px" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step Components
function BusinessBasicsStep() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brandName">Restaurant Brand Name</Label>
          <Input id="brandName" placeholder="e.g., Sufrah Restaurant" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legalName">Legal Business Name</Label>
          <Input id="legalName" placeholder="e.g., Sufrah LLC" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ae">United Arab Emirates</SelectItem>
              <SelectItem value="sa">Saudi Arabia</SelectItem>
              <SelectItem value="eg">Egypt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="e.g., Dubai" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gst">GST (UTC+4)</SelectItem>
              <SelectItem value="ast">AST (UTC+3)</SelectItem>
              <SelectItem value="eet">EET (UTC+2)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Business Email</Label>
        <Input id="email" type="email" placeholder="contact@sufrah.com" />
        <p className="text-xs text-muted-foreground">Must use your business domain</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website (Optional)</Label>
        <Input id="website" placeholder="https://sufrah.com" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="optInText">Opt-in Promise Text</Label>
        <Textarea
          id="optInText"
          placeholder="We send order confirmations & delivery updates only"
          className="min-h-[80px]"
        />
      </div>
    </div>
  )
}

function MetaAccountStep() {
  const [pathChoice, setPathChoice] = useState<string>("")

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Connect Your Meta Account</h3>
        <p className="text-muted-foreground">Choose how you want to verify your business</p>
      </div>

      <RadioGroup value={pathChoice} onValueChange={setPathChoice} className="space-y-4">
        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="facebook" id="facebook" />
          <Label htmlFor="facebook" className="flex-1 cursor-pointer">
            <div className="font-medium">Connect Facebook Business</div>
            <div className="text-sm text-muted-foreground">
              Fastest verification using existing Facebook Business Manager
            </div>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="documents" id="documents" />
          <Label htmlFor="documents" className="flex-1 cursor-pointer">
            <div className="font-medium">Upload Business Documents</div>
            <div className="text-sm text-muted-foreground">
              Manual verification with business registration documents
            </div>
          </Label>
        </div>
      </RadioGroup>

      {pathChoice === "facebook" && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
          <Button className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white">Continue with Facebook Business</Button>
          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to Facebook to select your Business Manager and Page
          </p>
        </motion.div>
      )}

      {pathChoice === "documents" && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium mb-1">Business Registration/License</p>
              <p className="text-sm text-muted-foreground">Upload your business registration document</p>
              <Button variant="outline" className="mt-3 bg-transparent">
                Choose File
              </Button>
            </div>

            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium mb-1">Proof of Address/Phone</p>
              <p className="text-sm text-muted-foreground">Utility bill, phone bill, or bank statement</p>
              <Button variant="outline" className="mt-3 bg-transparent">
                Choose File
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Meta Business Verification will begin in the background. This process can take 1-3
              business days.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function WhatsAppNumberStep() {
  const [numberChoice, setNumberChoice] = useState<string>("")

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Setup WhatsApp Number</h3>
        <p className="text-muted-foreground">Choose your WhatsApp Business number</p>
      </div>

      <RadioGroup value={numberChoice} onValueChange={setNumberChoice} className="space-y-4">
        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="existing" id="existing" />
          <Label htmlFor="existing" className="flex-1 cursor-pointer">
            <div className="font-medium">Use Existing Number</div>
            <div className="text-sm text-muted-foreground">Connect your current WhatsApp Business number</div>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="port" id="port" />
          <Label htmlFor="port" className="flex-1 cursor-pointer">
            <div className="font-medium">Port a Number</div>
            <div className="text-sm text-muted-foreground">Transfer your existing number to WhatsApp Business</div>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="new" id="new" />
          <Label htmlFor="new" className="flex-1 cursor-pointer">
            <div className="font-medium">Get New Number via Sufrah</div>
            <div className="text-sm text-muted-foreground">We'll provision a new number for your business</div>
          </Label>
        </div>
      </RadioGroup>

      {numberChoice && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+971 50 123 4567" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twoStepPin">Two-Step Verification PIN</Label>
              <Input id="twoStepPin" type="password" placeholder="Enter 6-digit PIN" maxLength={6} />
              <p className="text-xs text-muted-foreground">This PIN will secure your WhatsApp Business Account</p>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Next Steps:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Register number in WhatsApp Business API</li>
              <li>• Attach to your business tenant</li>
              <li>• Enable webhooks for incoming messages</li>
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function DisplayNameStep() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Badge className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Business Display Name</h3>
        <p className="text-muted-foreground">This name will appear to your customers on WhatsApp</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input id="displayName" placeholder="Sufrah | Restaurant" />
          <p className="text-xs text-muted-foreground">Suggested format: "Sufrah | {Restaurant}" or your brand name</p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">WhatsApp Naming Rules:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Must match your business brand</li>
            <li>• No emojis or generic terms</li>
            <li>• Clear and professional</li>
            <li>• Maximum 25 characters</li>
          </ul>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Approval Status</p>
              <p className="text-sm text-muted-foreground">Your display name will be reviewed by Meta</p>
            </div>
            <Badge variant="secondary">Pending</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplatesStep() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Message Templates</h3>
        <p className="text-muted-foreground">Pre-approved templates for order communications</p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Order Confirmation</h4>
            <Badge variant="secondary">Required</Badge>
          </div>
          <div className="bg-muted/30 p-3 rounded text-sm font-mono">
            Your order #{`{{order_id}}`} has been confirmed! Total: ${`{{total}}`}. Estimated delivery: {`{{eta}}`}.
            Track: {`{{tracking_url}}`}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Variables are locked for compliance. You can adjust the tone and wording.
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Order Status Update</h4>
            <Badge variant="secondary">Required</Badge>
          </div>
          <div className="bg-muted/30 p-3 rounded text-sm font-mono">
            Order #{`{{order_id}}`} status: {`{{status}}`}.{`{{eta}}`} - Thank you for choosing us!
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Address Request</h4>
            <Badge variant="outline">Utility</Badge>
          </div>
          <div className="bg-muted/30 p-3 rounded text-sm font-mono">
            Hi! We need your delivery address to complete your order. Please share your location or type your address.
          </div>
          <p className="text-xs text-muted-foreground mt-2">Used only outside the 24-hour messaging window</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Payment Link</h4>
            <Badge variant="outline">Optional</Badge>
          </div>
          <div className="bg-muted/30 p-3 rounded text-sm font-mono">
            Complete your payment for order #{`{{order_id}}`}: {`{{payment_link}}`}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Only available if online payments are enabled</p>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
        <p className="text-sm">
          <strong>Note:</strong> All templates will be submitted to Meta for approval. This process typically takes
          24-48 hours.
        </p>
      </div>
    </div>
  )
}

function MenuDeliveryStep() {
  const [importMethod, setImportMethod] = useState<string>("")

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Menu & Delivery Setup</h3>
        <p className="text-muted-foreground">Configure your menu items and delivery options</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">Menu Import Method</Label>
          <RadioGroup value={importMethod} onValueChange={setImportMethod} className="mt-3">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="flex-1 cursor-pointer">
                <div className="font-medium">Import CSV File</div>
                <div className="text-sm text-muted-foreground">
                  Upload menu with categories, items, variants, and pricing
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="flex-1 cursor-pointer">
                <div className="font-medium">Add Manually</div>
                <div className="text-sm text-muted-foreground">Create menu items one by one</div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {importMethod === "csv" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center"
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium mb-1">Upload Menu CSV</p>
            <p className="text-sm text-muted-foreground mb-3">
              Include categories, items, variants, add-ons in Arabic and English
            </p>
            <Button variant="outline">Choose File</Button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deliveryFee">Delivery Fee</Label>
            <Input id="deliveryFee" placeholder="15.00" type="number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minOrder">Minimum Order</Label>
            <Input id="minOrder" placeholder="50.00" type="number" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliveryZones">Delivery Zones</Label>
          <Textarea id="deliveryZones" placeholder="Downtown, Marina, JBR, Business Bay..." className="min-h-[80px]" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eta">Estimated Delivery Time</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select ETA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

function PaymentsStep() {
  const [paymentEnabled, setPaymentEnabled] = useState(false)

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Payment Methods</h3>
        <p className="text-muted-foreground">Configure how customers can pay for orders</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium">Cash on Delivery</h4>
            <p className="text-sm text-muted-foreground">Default payment method - always enabled</p>
          </div>
          <Badge variant="secondary">Enabled</Badge>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium">Online Payments</h4>
            <p className="text-sm text-muted-foreground">Accept card payments through payment gateway</p>
          </div>
          <Checkbox checked={paymentEnabled} onCheckedChange={setPaymentEnabled} />
        </div>

        {paymentEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Payment Gateway</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paymob">Paymob</SelectItem>
                  <SelectItem value="tap">Tap Payments</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> When online payments are enabled, the Payment_Link template will be mapped to
                your gateway URL generator.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function ComplianceStep() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Compliance & Safety</h3>
        <p className="text-muted-foreground">Anti-ban settings and WhatsApp policy compliance</p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">Opt-in Sources Ready</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <span className="text-sm">QR Code Poster</span>
              <Badge variant="outline">Ready</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <span className="text-sm">Website Snippet</span>
              <Badge variant="outline">Ready</Badge>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">Opt-out Keywords</h4>
          <div className="bg-muted/30 p-3 rounded text-sm">
            <strong>Preloaded:</strong> STOP, UNSUBSCRIBE, إلغاء
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Automatic confirmation message will be sent when customers opt out
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">Policy Firewall</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">24-hour window enforcement</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Utility templates only outside window</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Free-form messaging disabled</span>
              <Badge variant="secondary">Active</Badge>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">Number Warm-up Schedule</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Week 1: Low volume (50 messages/day)</span>
              <Badge variant="outline">Scheduled</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Week 2-3: Medium volume (200 messages/day)</span>
              <Badge variant="outline">Scheduled</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Week 4+: Full volume</span>
              <Badge variant="outline">Scheduled</Badge>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Quality Rating</p>
              <p className="text-sm text-muted-foreground">Current messaging tier status</p>
            </div>
            <Badge variant="secondary">High Quality</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivateBotStep() {
  const [allChecked, setAllChecked] = useState(false)

  const preconditions = [
    { label: "Business verification submitted/approved", status: "completed" },
    { label: "WABA number registered + 2FA set", status: "completed" },
    { label: "Display name approved", status: "pending" },
    { label: "Order templates approved", status: "completed" },
    { label: "Menu & delivery configured", status: "completed" },
    { label: "Compliance settings active", status: "completed" },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Activate Your Bot</h3>
        <p className="text-muted-foreground">Final review and bot activation</p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Preconditions Check</h4>
        {preconditions.map((condition, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <span className="text-sm">{condition.label}</span>
            <Badge
              variant={condition.status === "completed" ? "secondary" : "outline"}
              className={condition.status === "completed" ? "bg-green-100 text-green-800" : ""}
            >
              {condition.status === "completed" ? "Completed" : "Pending"}
            </Badge>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg text-center">
        <h4 className="font-semibold mb-2">Ready to Launch!</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Your WhatsApp bot is configured and ready to start receiving orders
        </p>

        <div className="space-y-3">
          <Button size="lg" className="w-full bg-primary hover:bg-primary/90">
            <Sparkles className="w-5 h-5 mr-2" />
            Activate Bot
          </Button>

          <p className="text-xs text-muted-foreground">
            QR code and WhatsApp link will be generated for customer sharing
          </p>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Generate customer QR code and WhatsApp link</li>
          <li>• Start receiving orders directly in Sufrah dashboard</li>
          <li>• Monitor conversations and manage orders</li>
          <li>• Track usage and message quotas</li>
        </ul>
      </div>
    </div>
  )
}
