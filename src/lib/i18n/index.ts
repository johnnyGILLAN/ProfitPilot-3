// src/lib/i18n/index.ts (server components)
import { createI18nServer } from 'next-international/server';
 
export const { getI18n, getScopedI18n, getCurrentLocale, getStaticParams } = createI18nServer({
  en: () => import('@/locales/en'),
  id: () => import('@/locales/id'),
});
