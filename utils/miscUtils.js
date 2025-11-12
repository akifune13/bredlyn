// General-purpose helpers
export function formatBigNumber(n) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return "N/A";
  n = Number(n);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return `${n}`;
}

export function timeAgo(dateStr) {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  if (isNaN(d)) return "Unknown";
  const diff = Math.max(0, Date.now() - d.getTime());
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const month = Math.floor(day / 30);
  const year = Math.floor(day / 365);
  if (year) return `${year} year${year > 1 ? "s" : ""} ago`;
  if (month) return `${month} month${month > 1 ? "s" : ""} ago`;
  if (day) return `${day} day${day > 1 ? "s" : ""} ago`;
  if (hr) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  if (min) return `${min} minute${min > 1 ? "s" : ""} ago`;
  return `${sec} second${sec !== 1 ? "s" : ""} ago`;
}

// Send a reply and return the message object
export async function sendAndGetMessage(interactionLike, payload) {
  if (typeof interactionLike.editReply === "function") {
    try {
      const res = await interactionLike.editReply(payload);
      if (res) return res;
    } catch {}
    if (typeof interactionLike.fetchReply === "function") {
      try { return await interactionLike.fetchReply(); } catch {}
    }
    try {
      const messages = await interactionLike.channel.messages.fetch({ limit: 10 });
      return messages.find(m => m.author?.id === interactionLike.client?.user?.id) || messages.first();
    } catch { return null; }
  }
  if (interactionLike.channel?.send) return await interactionLike.channel.send(payload);
  return null;
}
