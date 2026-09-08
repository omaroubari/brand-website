import type { UIStringsOverride } from "../i18n-ui";

/** Arabic template UI strings. Omitted leaves fall back through the resolver. */
export const ar = {
  actions: {
    close: "إغلاق",
    copy: "نسخ",
    copied: "تم النسخ",
    copyFailed: "تعذّر النسخ",
  },
  brand: {
    assets: "الأصول",
    contact: "التواصل",
    contactLead: "إذا لم تجد الإجابة في هذا الدليل، فتواصل معنا قبل الاجتهاد.",
    document: "المستند",
    guidelines: "دليل الهوية",
    licenceAndDownloads: "الترخيص والتنزيلات",
    version: "الإصدار",
  },
  color: {
    copied: "تم نسخ اللون",
    textOn: "النص على",
    sameColorNoContrast: "اللون نفسه، لا يوجد تباين",
    shade: "درجة",
    hex: "HEX",
    rgb: "RGB",
    cmyk: "CMYK",
  },
  content: {
    do: "افعل",
    dont: "لا تفعل",
    note: "ملاحظة",
    pending: "قيد الإعداد",
  },
  languageSwitcher: { label: "اللغة" },
  logo: {
    minimumSize: "الحد الأدنى للحجم",
    clearspaceInstruction:
      "{unit} = x. اترك مساحة فارغة لا تقل عن x حول {mark} من جميع الجهات. لا يجوز أن يدخل أي نص أو صورة أو عنصر رسومي إلى هذه المنطقة.",
  },
  nav: {
    sections: "الأقسام",
    menu: "القائمة",
    navigation: "القائمة",
    toggleSidebar: "تبديل اللوحة جانبية",
  },
  page: {
    previous: "السابق",
    next: "التالي",
    pagination: "نظام الصفحات",
  },
  theme: {
    light: "فاتح",
    dark: "داكن",
    system: "النظام",
    switchTo: "التبديل إلى",
  },
  toc: {
    title: "في هذه الصفحة",
    contents: "المحتويات",
  },
  typography: {
    size: "الحجم",
    leading: "التباعد الرأسي",
    tracking: "التقارب",
    weight: "السماكة",
    print: "الطباعة",
    display: "عرض",
    text: "نص",
    uppercase: "الأحرف الكبيرة",
    lowercase: "الأحرف الصغيرة",
    letters: "الأحرف",
    numerals: "الأرقام",
    punctuation: "علامات الترقيم",
  },
} satisfies UIStringsOverride;
