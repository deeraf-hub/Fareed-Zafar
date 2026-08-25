import { MessageCircle } from 'lucide-react';
import { generalInquiryLink } from '../../lib/whatsapp';

/** Floating WhatsApp button — sits above the mobile cart bar. */
export const WhatsAppFab = () => (
  <a
    href={generalInquiryLink()}
    target="_blank"
    rel="noreferrer noopener"
    className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 sm:bottom-6"
    aria-label="Chat with us on WhatsApp"
  >
    <MessageCircle className="size-7" aria-hidden="true" />
  </a>
);
