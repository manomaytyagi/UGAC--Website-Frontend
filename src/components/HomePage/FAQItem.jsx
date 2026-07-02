import { useState } from "react";

export default function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item ${open ? "faq-item--open" : ""}`}>
      <button className="faq-item__question" type="button" onClick={() => setOpen((isOpen) => !isOpen)}>
        <span>{q}</span>
        <span className="faq-item__icon">+</span>
      </button>
      {open && <p className="faq-item__answer">{a}</p>}
    </div>
  );
}
