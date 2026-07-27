import { StrictMode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { I18nextProvider, createI18n } from "@/lib/i18n";
import files from "@/locales/files";
import type { ViewData } from "@/global";

type ClientShellProps = {
  children: React.ReactNode;
  view: ViewData;
};

export default function ClientShell({ children, view }: ClientShellProps) {
  const locale = createI18n({
    lang: view.meta.locale || "en",
    resources: files,
    fallbackLang: "en",
    defaultNS: "translation",
  });

  return (
    <StrictMode>
      <I18nextProvider i18n={locale} defaultNS="translation">
        {children}
        <Toaster richColors />
      </I18nextProvider>
    </StrictMode>
  );
}
