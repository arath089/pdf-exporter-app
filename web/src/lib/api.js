export async function createPdf({ isWidget, clientId, rawText, preset }) {
  if (isWidget && window.openai?.callTool) {
    const result = await window.openai.callTool("create_pdf", {
      rawText,
      preset,
      clientId,
    });
    return result?.structuredContent ?? result;
  }

  const res = await fetch("/api/create-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-client-id": clientId },
    body: JSON.stringify({ rawText, preset, clientId }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || JSON.stringify(json));
  return json;
}
