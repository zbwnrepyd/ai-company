import type { QAItem } from "./types";

interface FAQSectionProps {
  items: QAItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  return (
    <div className="faq-shell" data-testid="faq-shell">
      <div className="faq-content">
        <h2 id="faq-title" className="faq-title">
          Q&A
        </h2>

        <ul className="faq-list" aria-label="常见问题列表">
          {items.map((item) => (
            <li key={item.text} className="faq-item">
              {item.text}
            </li>
          ))}
        </ul>

        <div className="faq-contact">
          <strong>联系我</strong>
          <div className="qr-placeholder">微信公众号二维码</div>
        </div>
      </div>
    </div>
  );
}
