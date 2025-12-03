import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  School,
  Users,
  CreditCard,
  FileText,
  Award,
  Settings,
  Shield,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Info,
  ClipboardCheck,
  Calendar,
  MapPin,
  FileSpreadsheet,
  Mail,
  Bell,
  BarChart3,
  Globe,
} from "lucide-react";

interface DocSection {
  id: string;
  title: string;
  titleAr: string;
  icon: any;
  content: DocContent[];
}

interface DocContent {
  heading: string;
  headingAr: string;
  steps?: { step: string; stepAr: string }[];
  notes?: { note: string; noteAr: string; type: "info" | "warning" | "success" }[];
  description?: string;
  descriptionAr?: string;
}

const schoolAdminDocs: DocSection[] = [
  {
    id: "registration",
    title: "School Registration",
    titleAr: "تسجيل المدرسة",
    icon: School,
    content: [
      {
        heading: "How to Register Your School",
        headingAr: "كيفية تسجيل مدرستك",
        description: "Follow these steps to register your school in the Amaanah Examination System.",
        descriptionAr: "اتبع هذه الخطوات لتسجيل مدرستك في نظام امتحانات الأمانة.",
        steps: [
          { step: "Go to the School Registration page from the public website", stepAr: "انتقل إلى صفحة تسجيل المدرسة من الموقع العام" },
          { step: "Fill in your school details: name, type, region, cluster, and contact information", stepAr: "أدخل بيانات مدرستك: الاسم، النوع، المنطقة، المجموعة، ومعلومات الاتصال" },
          { step: "Enter the registrar's name, email, and password", stepAr: "أدخل اسم المسجل والبريد الإلكتروني وكلمة المرور" },
          { step: "Submit the registration form", stepAr: "أرسل نموذج التسجيل" },
          { step: "Check your email for verification link and click to verify", stepAr: "تحقق من بريدك الإلكتروني للحصول على رابط التحقق وانقر للتأكيد" },
          { step: "Wait for the Examination Board to approve your school", stepAr: "انتظر موافقة مجلس الامتحانات على مدرستك" },
        ],
        notes: [
          { note: "You will receive an email notification when your school is approved", noteAr: "ستتلقى إشعارًا بالبريد الإلكتروني عند الموافقة على مدرستك", type: "info" },
          { note: "Make sure to use a valid email address that you can access", noteAr: "تأكد من استخدام عنوان بريد إلكتروني صالح يمكنك الوصول إليه", type: "warning" },
        ],
      },
    ],
  },
  {
    id: "students",
    title: "Student Registration",
    titleAr: "تسجيل الطلاب",
    icon: Users,
    content: [
      {
        heading: "How to Register Students",
        headingAr: "كيفية تسجيل الطلاب",
        description: "Register students for the current examination year using CSV upload.",
        descriptionAr: "سجل الطلاب للعام الدراسي الحالي باستخدام رفع ملف CSV.",
        steps: [
          { step: "Navigate to Students page from the sidebar", stepAr: "انتقل إلى صفحة الطلاب من الشريط الجانبي" },
          { step: "Click 'Upload Students' button", stepAr: "انقر على زر 'رفع الطلاب'" },
          { step: "Download the CSV template first to see the required format", stepAr: "قم بتنزيل قالب CSV أولاً لمعرفة التنسيق المطلوب" },
          { step: "Fill in the template with student data (name, Arabic name, date of birth, gender, grade)", stepAr: "أملأ القالب ببيانات الطلاب (الاسم، الاسم بالعربية، تاريخ الميلاد، الجنس، الصف)" },
          { step: "Upload the completed CSV file", stepAr: "ارفع ملف CSV المكتمل" },
          { step: "Review the import results and fix any errors", stepAr: "راجع نتائج الاستيراد وأصلح أي أخطاء" },
        ],
        notes: [
          { note: "An invoice will be automatically generated after uploading students", noteAr: "سيتم إنشاء فاتورة تلقائيًا بعد رفع الطلاب", type: "info" },
          { note: "Date format should be YYYY-MM-DD (e.g., 2010-05-15)", noteAr: "يجب أن يكون تنسيق التاريخ YYYY-MM-DD (مثال: 2010-05-15)", type: "warning" },
          { note: "Gender should be 'male' or 'female'", noteAr: "يجب أن يكون الجنس 'male' أو 'female'", type: "warning" },
        ],
      },
      {
        heading: "CSV Template Format",
        headingAr: "تنسيق قالب CSV",
        description: "The CSV file must have these columns in order:",
        descriptionAr: "يجب أن يحتوي ملف CSV على هذه الأعمدة بالترتيب:",
        steps: [
          { step: "fullName - Student's full name in English", stepAr: "fullName - الاسم الكامل للطالب بالإنجليزية" },
          { step: "arabicName - Student's full name in Arabic", stepAr: "arabicName - الاسم الكامل للطالب بالعربية" },
          { step: "dateOfBirth - Date in YYYY-MM-DD format", stepAr: "dateOfBirth - التاريخ بتنسيق YYYY-MM-DD" },
          { step: "gender - Either 'male' or 'female'", stepAr: "gender - إما 'male' أو 'female'" },
          { step: "grade - Grade level (1-12)", stepAr: "grade - المستوى الدراسي (1-12)" },
        ],
      },
    ],
  },
  {
    id: "payments",
    title: "Payments & Invoices",
    titleAr: "المدفوعات والفواتير",
    icon: CreditCard,
    content: [
      {
        heading: "How to Pay Examination Fees",
        headingAr: "كيفية دفع رسوم الامتحانات",
        description: "Complete payment process to register students for examinations.",
        descriptionAr: "أكمل عملية الدفع لتسجيل الطلاب في الامتحانات.",
        steps: [
          { step: "Go to Payments page from the sidebar", stepAr: "انتقل إلى صفحة المدفوعات من الشريط الجانبي" },
          { step: "View your current invoice with the total amount due", stepAr: "اعرض فاتورتك الحالية مع المبلغ الإجمالي المستحق" },
          { step: "Make bank transfer to the provided bank account", stepAr: "قم بالتحويل البنكي إلى الحساب البنكي المحدد" },
          { step: "Take a photo or scan of your bank slip/receipt", stepAr: "التقط صورة أو امسح إيصال البنك/الإيصال" },
          { step: "Click 'Upload Bank Slip' and select your file", stepAr: "انقر على 'رفع إيصال البنك' واختر ملفك" },
          { step: "Wait for the Examination Board to confirm your payment", stepAr: "انتظر مجلس الامتحانات لتأكيد دفعتك" },
        ],
        notes: [
          { note: "Once payment is confirmed, your students will be automatically approved and assigned index numbers", noteAr: "بمجرد تأكيد الدفع، سيتم الموافقة على طلابك تلقائيًا وتعيين أرقام الفهرس", type: "success" },
          { note: "Keep your bank slip safe until payment is confirmed", noteAr: "احتفظ بإيصال البنك حتى يتم تأكيد الدفع", type: "info" },
          { note: "Payment must be made before the registration deadline", noteAr: "يجب الدفع قبل الموعد النهائي للتسجيل", type: "warning" },
        ],
      },
      {
        heading: "Understanding Your Invoice",
        headingAr: "فهم فاتورتك",
        description: "Your invoice includes:",
        descriptionAr: "تتضمن فاتورتك:",
        steps: [
          { step: "Registration fee per student", stepAr: "رسوم التسجيل لكل طالب" },
          { step: "Total number of registered students", stepAr: "إجمالي عدد الطلاب المسجلين" },
          { step: "Certificate and transcript fees (if applicable)", stepAr: "رسوم الشهادات وكشوف الدرجات (إن وجدت)" },
          { step: "Total amount due", stepAr: "المبلغ الإجمالي المستحق" },
        ],
      },
    ],
  },
  {
    id: "exam-cards",
    title: "Exam Cards",
    titleAr: "بطاقات الامتحان",
    icon: FileText,
    content: [
      {
        heading: "How to Print Exam Cards",
        headingAr: "كيفية طباعة بطاقات الامتحان",
        description: "Print exam cards for approved students.",
        descriptionAr: "اطبع بطاقات الامتحان للطلاب المعتمدين.",
        steps: [
          { step: "Go to Students page from the sidebar", stepAr: "انتقل إلى صفحة الطلاب من الشريط الجانبي" },
          { step: "Ensure your students are approved (status shows 'Approved')", stepAr: "تأكد من أن طلابك معتمدون (الحالة تظهر 'معتمد')" },
          { step: "Select students you want to print exam cards for", stepAr: "حدد الطلاب الذين تريد طباعة بطاقات الامتحان لهم" },
          { step: "Click 'Print Exam Cards' button", stepAr: "انقر على زر 'طباعة بطاقات الامتحان'" },
          { step: "Review the PDF and print", stepAr: "راجع ملف PDF واطبع" },
        ],
        notes: [
          { note: "Students must be approved before exam cards can be printed", noteAr: "يجب أن يكون الطلاب معتمدين قبل طباعة بطاقات الامتحان", type: "warning" },
          { note: "Exam cards contain student photo, index number, and exam schedule", noteAr: "تحتوي بطاقات الامتحان على صورة الطالب ورقم الفهرس وجدول الامتحان", type: "info" },
        ],
      },
    ],
  },
  {
    id: "results",
    title: "View Results",
    titleAr: "عرض النتائج",
    icon: Award,
    content: [
      {
        heading: "How to View Student Results",
        headingAr: "كيفية عرض نتائج الطلاب",
        description: "Access published examination results for your students.",
        descriptionAr: "الوصول إلى نتائج الامتحانات المنشورة لطلابك.",
        steps: [
          { step: "Go to Results page from the sidebar", stepAr: "انتقل إلى صفحة النتائج من الشريط الجانبي" },
          { step: "Select the examination year", stepAr: "حدد سنة الامتحان" },
          { step: "View results for all your students", stepAr: "اعرض نتائج جميع طلابك" },
          { step: "Download or print individual result slips", stepAr: "قم بتنزيل أو طباعة قسائم النتائج الفردية" },
        ],
        notes: [
          { note: "Results are available only after they are published by the Examination Board", noteAr: "النتائج متاحة فقط بعد نشرها من قبل مجلس الامتحانات", type: "info" },
        ],
      },
    ],
  },
];

const examAdminDocs: DocSection[] = [
  {
    id: "school-management",
    title: "School Management",
    titleAr: "إدارة المدارس",
    icon: School,
    content: [
      {
        heading: "Approving Schools",
        headingAr: "الموافقة على المدارس",
        description: "Review and approve school registrations.",
        descriptionAr: "مراجعة والموافقة على تسجيلات المدارس.",
        steps: [
          { step: "Navigate to Schools page from the sidebar", stepAr: "انتقل إلى صفحة المدارس من الشريط الجانبي" },
          { step: "Filter by status 'Pending' to see schools awaiting approval", stepAr: "قم بالتصفية حسب الحالة 'معلق' لرؤية المدارس في انتظار الموافقة" },
          { step: "Click on a school to view its details", stepAr: "انقر على مدرسة لعرض تفاصيلها" },
          { step: "Verify the school information and documents", stepAr: "تحقق من معلومات المدرسة والوثائق" },
          { step: "Click 'Approve' or 'Reject' with a reason", stepAr: "انقر على 'موافقة' أو 'رفض' مع ذكر السبب" },
        ],
        notes: [
          { note: "Schools will be notified by email of their approval status", noteAr: "سيتم إخطار المدارس بالبريد الإلكتروني بحالة موافقتها", type: "info" },
        ],
      },
    ],
  },
  {
    id: "payment-confirmation",
    title: "Payment Confirmation",
    titleAr: "تأكيد الدفع",
    icon: CreditCard,
    content: [
      {
        heading: "Confirming Payments",
        headingAr: "تأكيد المدفوعات",
        description: "Review bank slips and confirm payments from schools.",
        descriptionAr: "مراجعة إيصالات البنك وتأكيد المدفوعات من المدارس.",
        steps: [
          { step: "Go to Payments page from the sidebar", stepAr: "انتقل إلى صفحة المدفوعات من الشريط الجانبي" },
          { step: "Filter invoices by 'Processing' status", stepAr: "قم بتصفية الفواتير حسب حالة 'قيد المعالجة'" },
          { step: "Click on an invoice to view the bank slip", stepAr: "انقر على فاتورة لعرض إيصال البنك" },
          { step: "Verify the payment amount matches the invoice", stepAr: "تحقق من أن مبلغ الدفع يطابق الفاتورة" },
          { step: "Click 'Confirm Payment' if valid, or 'Reject' with reason", stepAr: "انقر على 'تأكيد الدفع' إذا كان صالحًا، أو 'رفض' مع ذكر السبب" },
        ],
        notes: [
          { note: "When payment is confirmed, all pending students are automatically approved and assigned index numbers", noteAr: "عند تأكيد الدفع، تتم الموافقة تلقائيًا على جميع الطلاب المعلقين وتعيين أرقام الفهرس", type: "success" },
          { note: "The school will be notified of payment confirmation", noteAr: "سيتم إخطار المدرسة بتأكيد الدفع", type: "info" },
        ],
      },
    ],
  },
  {
    id: "results-management",
    title: "Results Management",
    titleAr: "إدارة النتائج",
    icon: FileSpreadsheet,
    content: [
      {
        heading: "Uploading Results",
        headingAr: "رفع النتائج",
        description: "Upload examination results via CSV.",
        descriptionAr: "رفع نتائج الامتحانات عبر CSV.",
        steps: [
          { step: "Go to Results page from the sidebar", stepAr: "انتقل إلى صفحة النتائج من الشريط الجانبي" },
          { step: "Select the examination year", stepAr: "حدد سنة الامتحان" },
          { step: "Click 'Upload Results' button", stepAr: "انقر على زر 'رفع النتائج'" },
          { step: "Download the CSV template for the correct format", stepAr: "قم بتنزيل قالب CSV للتنسيق الصحيح" },
          { step: "Fill in student index numbers and scores", stepAr: "أملأ أرقام فهرس الطلاب والدرجات" },
          { step: "Upload the completed file", stepAr: "ارفع الملف المكتمل" },
          { step: "Review and publish results when ready", stepAr: "راجع وانشر النتائج عندما تكون جاهزة" },
        ],
        notes: [
          { note: "Results remain hidden until published", noteAr: "تبقى النتائج مخفية حتى النشر", type: "info" },
          { note: "Verify all data before publishing - changes after publishing require special approval", noteAr: "تحقق من جميع البيانات قبل النشر - التغييرات بعد النشر تتطلب موافقة خاصة", type: "warning" },
        ],
      },
    ],
  },
  {
    id: "certificates",
    title: "Certificates & Transcripts",
    titleAr: "الشهادات وكشوف الدرجات",
    icon: Award,
    content: [
      {
        heading: "Generating Certificates",
        headingAr: "إنشاء الشهادات",
        description: "Generate and print certificates for successful students.",
        descriptionAr: "إنشاء وطباعة الشهادات للطلاب الناجحين.",
        steps: [
          { step: "Go to Certificates page from the sidebar", stepAr: "انتقل إلى صفحة الشهادات من الشريط الجانبي" },
          { step: "Select the examination year", stepAr: "حدد سنة الامتحان" },
          { step: "Filter students who passed", stepAr: "قم بتصفية الطلاب الناجحين" },
          { step: "Select students and click 'Generate Certificates'", stepAr: "حدد الطلاب وانقر على 'إنشاء الشهادات'" },
          { step: "Review generated certificates", stepAr: "راجع الشهادات المُنشأة" },
          { step: "Print or download certificates", stepAr: "اطبع أو قم بتنزيل الشهادات" },
        ],
        notes: [
          { note: "Certificates include QR code for verification", noteAr: "تتضمن الشهادات رمز QR للتحقق", type: "info" },
          { note: "Gender-specific templates are automatically applied", noteAr: "يتم تطبيق قوالب خاصة بالجنس تلقائيًا", type: "info" },
        ],
      },
    ],
  },
];

const superAdminDocs: DocSection[] = [
  {
    id: "exam-years",
    title: "Examination Years",
    titleAr: "سنوات الامتحان",
    icon: Calendar,
    content: [
      {
        heading: "Managing Exam Years",
        headingAr: "إدارة سنوات الامتحان",
        description: "Create and manage examination years.",
        descriptionAr: "إنشاء وإدارة سنوات الامتحان.",
        steps: [
          { step: "Go to Exam Years page from the sidebar", stepAr: "انتقل إلى صفحة سنوات الامتحان من الشريط الجانبي" },
          { step: "Click 'Add Exam Year' to create a new year", stepAr: "انقر على 'إضافة سنة امتحان' لإنشاء سنة جديدة" },
          { step: "Set the year, registration dates, and exam dates", stepAr: "حدد السنة وتواريخ التسجيل وتواريخ الامتحان" },
          { step: "Configure fee structure (per student, certificate, transcript)", stepAr: "قم بتكوين هيكل الرسوم (لكل طالب، شهادة، كشف درجات)" },
          { step: "Mark one year as 'Current' for active registrations", stepAr: "حدد سنة واحدة كـ 'حالية' للتسجيلات النشطة" },
        ],
        notes: [
          { note: "Only one exam year can be marked as current at a time", noteAr: "يمكن تحديد سنة امتحان واحدة فقط كحالية في وقت واحد", type: "warning" },
          { note: "Past exam years become read-only automatically", noteAr: "تصبح سنوات الامتحان الماضية للقراءة فقط تلقائيًا", type: "info" },
        ],
      },
    ],
  },
  {
    id: "regions-clusters",
    title: "Regions & Clusters",
    titleAr: "المناطق والمجموعات",
    icon: MapPin,
    content: [
      {
        heading: "Managing Regions",
        headingAr: "إدارة المناطق",
        description: "Configure regions and school clusters.",
        descriptionAr: "تكوين المناطق ومجموعات المدارس.",
        steps: [
          { step: "Go to Regions page from the sidebar", stepAr: "انتقل إلى صفحة المناطق من الشريط الجانبي" },
          { step: "Add new regions as needed", stepAr: "أضف مناطق جديدة حسب الحاجة" },
          { step: "For each region, add clusters", stepAr: "لكل منطقة، أضف مجموعات" },
          { step: "Schools will select their region and cluster during registration", stepAr: "ستختار المدارس منطقتها ومجموعتها أثناء التسجيل" },
        ],
      },
    ],
  },
  {
    id: "user-management",
    title: "User Management",
    titleAr: "إدارة المستخدمين",
    icon: Shield,
    content: [
      {
        heading: "Managing System Users",
        headingAr: "إدارة مستخدمي النظام",
        description: "Add and manage administrative users.",
        descriptionAr: "إضافة وإدارة المستخدمين الإداريين.",
        steps: [
          { step: "Go to Settings page", stepAr: "انتقل إلى صفحة الإعدادات" },
          { step: "Navigate to User Management tab", stepAr: "انتقل إلى علامة تبويب إدارة المستخدمين" },
          { step: "Click 'Add User' to create a new admin", stepAr: "انقر على 'إضافة مستخدم' لإنشاء مسؤول جديد" },
          { step: "Set their email, name, and role", stepAr: "حدد بريدهم الإلكتروني واسمهم ودورهم" },
          { step: "They will receive an email to set their password", stepAr: "سيتلقون بريدًا إلكترونيًا لتعيين كلمة المرور" },
        ],
        notes: [
          { note: "Available roles: Super Admin, Examination Admin, Logistics Admin", noteAr: "الأدوار المتاحة: مسؤول أعلى، مسؤول امتحانات، مسؤول لوجستي", type: "info" },
        ],
      },
    ],
  },
  {
    id: "system-settings",
    title: "System Settings",
    titleAr: "إعدادات النظام",
    icon: Settings,
    content: [
      {
        heading: "Configuring System Settings",
        headingAr: "تكوين إعدادات النظام",
        description: "Configure organization details and system preferences.",
        descriptionAr: "تكوين تفاصيل المنظمة وتفضيلات النظام.",
        steps: [
          { step: "Go to Settings from the sidebar", stepAr: "انتقل إلى الإعدادات من الشريط الجانبي" },
          { step: "Update organization name and contact details", stepAr: "قم بتحديث اسم المنظمة وتفاصيل الاتصال" },
          { step: "Configure notification preferences", stepAr: "قم بتكوين تفضيلات الإشعارات" },
          { step: "Set default fee structures", stepAr: "حدد هياكل الرسوم الافتراضية" },
        ],
      },
    ],
  },
];

const publicUserDocs: DocSection[] = [
  {
    id: "result-checker",
    title: "Check Results",
    titleAr: "التحقق من النتائج",
    icon: Award,
    content: [
      {
        heading: "How to Check Examination Results",
        headingAr: "كيفية التحقق من نتائج الامتحان",
        description: "Check your examination results using your index number.",
        descriptionAr: "تحقق من نتائج امتحانك باستخدام رقم الفهرس.",
        steps: [
          { step: "Go to the Result Checker page on the public website", stepAr: "انتقل إلى صفحة فحص النتائج على الموقع العام" },
          { step: "Enter your Index Number", stepAr: "أدخل رقم الفهرس الخاص بك" },
          { step: "Enter your Date of Birth", stepAr: "أدخل تاريخ ميلادك" },
          { step: "Click 'Check Result'", stepAr: "انقر على 'تحقق من النتيجة'" },
          { step: "View your results and download if needed", stepAr: "اعرض نتائجك وقم بالتنزيل إذا لزم الأمر" },
        ],
        notes: [
          { note: "Results are available only after they are published", noteAr: "النتائج متاحة فقط بعد نشرها", type: "info" },
          { note: "Keep your index number safe - you will need it to check results", noteAr: "احتفظ برقم الفهرس الخاص بك بأمان - ستحتاجه للتحقق من النتائج", type: "warning" },
        ],
      },
    ],
  },
  {
    id: "certificate-verify",
    title: "Verify Certificate",
    titleAr: "التحقق من الشهادة",
    icon: CheckCircle2,
    content: [
      {
        heading: "How to Verify a Certificate",
        headingAr: "كيفية التحقق من الشهادة",
        description: "Verify the authenticity of an Amaanah certificate.",
        descriptionAr: "التحقق من صحة شهادة الأمانة.",
        steps: [
          { step: "Scan the QR code on the certificate", stepAr: "امسح رمز QR الموجود على الشهادة" },
          { step: "Or enter the certificate number on the verification page", stepAr: "أو أدخل رقم الشهادة على صفحة التحقق" },
          { step: "View the certificate details to confirm authenticity", stepAr: "اعرض تفاصيل الشهادة لتأكيد الصحة" },
        ],
        notes: [
          { note: "All genuine certificates have a unique QR code for verification", noteAr: "جميع الشهادات الأصلية لها رمز QR فريد للتحقق", type: "info" },
        ],
      },
    ],
  },
];

function DocSectionCard({ section, isRTL }: { section: DocSection; isRTL: boolean }) {
  const Icon = section.icon;
  
  return (
    <Card className="hover-elevate" data-testid={`card-doc-section-${section.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg" data-testid={`text-section-title-${section.id}`}>
            {isRTL ? section.titleAr : section.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {section.content.map((content, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} data-testid={`accordion-item-${section.id}-${idx}`}>
              <AccordionTrigger className="text-sm font-medium" data-testid={`button-accordion-${section.id}-${idx}`}>
                {isRTL ? content.headingAr : content.heading}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {content.description && (
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? content.descriptionAr : content.description}
                    </p>
                  )}
                  
                  {content.steps && (
                    <div className="space-y-2">
                      {content.steps.map((step, stepIdx) => (
                        <div key={stepIdx} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {stepIdx + 1}
                          </div>
                          <p className="text-sm pt-0.5">
                            {isRTL ? step.stepAr : step.step}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {content.notes && content.notes.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {content.notes.map((note, noteIdx) => (
                        <div 
                          key={noteIdx} 
                          className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                            note.type === 'warning' 
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200' 
                              : note.type === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                              : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200'
                          }`}
                        >
                          {note.type === 'warning' ? (
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          ) : note.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          )}
                          <span>{isRTL ? note.noteAr : note.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default function Documentation() {
  const { isRTL } = useLanguage();
  
  return (
    <div className={`container mx-auto py-6 px-4 max-w-6xl ${isRTL ? 'rtl' : 'ltr'}`} data-testid="page-documentation">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            {isRTL ? "دليل المستخدم" : "System Documentation"}
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="text-page-description">
          {isRTL 
            ? "دليل شامل لاستخدام نظام إدارة امتحانات الأمانة"
            : "Comprehensive guide for using the Amaanah Examination Management System"
          }
        </p>
      </div>

      <Tabs defaultValue="school-admin" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="school-admin" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-3"
            data-testid="tab-school-admin"
          >
            <School className="h-4 w-4" />
            <span className="hidden sm:inline">{isRTL ? "مدير المدرسة" : "School Admin"}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="exam-admin"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-3"
            data-testid="tab-exam-admin"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{isRTL ? "مدير الامتحانات" : "Exam Admin"}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="super-admin"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-3"
            data-testid="tab-super-admin"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{isRTL ? "المسؤول الأعلى" : "Super Admin"}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="public"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-3"
            data-testid="tab-public"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{isRTL ? "عام" : "Public"}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="school-admin" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-sm">
              <School className="h-3 w-3 me-1" />
              {isRTL ? "دليل مدير المدرسة" : "School Administrator Guide"}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {schoolAdminDocs.map((section) => (
              <DocSectionCard key={section.id} section={section} isRTL={isRTL} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exam-admin" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-sm">
              <ClipboardCheck className="h-3 w-3 me-1" />
              {isRTL ? "دليل مدير الامتحانات" : "Examination Administrator Guide"}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {examAdminDocs.map((section) => (
              <DocSectionCard key={section.id} section={section} isRTL={isRTL} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="super-admin" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-sm">
              <Shield className="h-3 w-3 me-1" />
              {isRTL ? "دليل المسؤول الأعلى" : "Super Administrator Guide"}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {superAdminDocs.map((section) => (
              <DocSectionCard key={section.id} section={section} isRTL={isRTL} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="public" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-sm">
              <Globe className="h-3 w-3 me-1" />
              {isRTL ? "دليل المستخدم العام" : "Public User Guide"}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {publicUserDocs.map((section) => (
              <DocSectionCard key={section.id} section={section} isRTL={isRTL} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-primary" />
            <CardTitle>{isRTL ? "هل تحتاج مساعدة؟" : "Need Help?"}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{isRTL ? "البريد الإلكتروني" : "Email Support"}</p>
                <p className="text-sm text-muted-foreground">support@amaanah.gm</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{isRTL ? "الإشعارات" : "Notifications"}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "تحقق من الإشعارات للتحديثات" : "Check notifications for updates"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{isRTL ? "لوحة التحكم" : "Dashboard"}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "عرض الملخص والإحصائيات" : "View summary and statistics"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}