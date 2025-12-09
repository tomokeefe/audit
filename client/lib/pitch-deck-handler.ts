// Pitch deck audit handler
export async function handlePitchDeckSubmit(file: File): Promise<any> {
  // Create FormData for file upload
  const formData = new FormData();
  formData.append("file", file);
  formData.append("auditType", "pitch_deck");

  console.log("Uploading pitch deck:", file.name, file.type, file.size);

  // Upload file and get audit result
  const response = await fetch("/api/audit/pitch-deck", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  const result = await response.json();
  console.log("Pitch deck audit result:", result);

  return result;
}
