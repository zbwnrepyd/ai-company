export type StartupCardRow = {
  label: string;
  value: string;
};

export type StartupCard = {
  slug: string;
  rows: StartupCardRow[];
};

function formatPrice(value: number | string) {
  if (typeof value === "number") {
    return `$${value.toLocaleString("en-US")}`;
  }

  return /^\d+(\.\d+)?$/.test(value) ? `$${Number(value).toLocaleString("en-US")}` : value;
}

export function buildStartupCard(input: {
  slug: string;
  description?: string | null;
  targetAudience?: string | null;
  onSale?: boolean | null;
  askingPrice?: number | string | null;
  techStack?: string[] | null;
}): StartupCard {
  const rows: StartupCardRow[] = [
    { label: "产品描述", value: input.description?.trim() || "暂无" },
    { label: "目标用户", value: input.targetAudience?.trim() || "暂无" },
  ];

  if (input.onSale != null) {
    rows.push({ label: "是否可售", value: input.onSale ? "是" : "否" });
  }

  if (input.askingPrice != null && String(input.askingPrice).trim() !== "") {
    rows.push({ label: "报价", value: formatPrice(input.askingPrice) });
  }

  if (input.techStack && input.techStack.length > 0) {
    rows.push({ label: "技术栈", value: input.techStack.join(", ") });
  }

  return {
    slug: input.slug,
    rows,
  };
}
