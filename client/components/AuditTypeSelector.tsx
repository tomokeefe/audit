import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, FileText, Upload, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface AuditTypeSelectorProps {
  auditType: "website" | "pitch_deck";
  setAuditType: (type: "website" | "pitch_deck") => void;
  url: string;
  setUrl: (url: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AuditTypeSelector({
  auditType,
  setAuditType,
  url,
  setUrl,
  selectedFile,
  setSelectedFile,
  isLoading,
  onSubmit,
}: AuditTypeSelectorProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/pdf",
      ];

      if (
        validTypes.includes(file.type) ||
        file.name.match(/\.(ppt|pptx|pdf)$/i)
      ) {
        setSelectedFile(file);
      } else {
        alert("Please select a valid PowerPoint (.ppt, .pptx) or PDF file");
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Audit Type Toggle */}
      <Tabs
        value={auditType}
        onValueChange={(value) =>
          setAuditType(value as "website" | "pitch_deck")
        }
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="website" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Website Audit
          </TabsTrigger>
          <TabsTrigger value="pitch_deck" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pitch Deck Audit
          </TabsTrigger>
        </TabsList>

        {/* Website Input */}
        <TabsContent value="website" className="mt-0">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Enter website URL to audit (e.g., example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10 h-12 text-lg"
                required={auditType === "website"}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 px-8 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Start Audit
                </div>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* File Upload */}
        <TabsContent value="pitch_deck" className="mt-0">
          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="pitch-deck-file"
                className={`flex items-center justify-center gap-3 h-12 px-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  selectedFile
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50"
                }`}
              >
                <Upload className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">
                  {selectedFile
                    ? selectedFile.name
                    : "Choose PPT, PPTX, or PDF file"}
                </span>
                <input
                  id="pitch-deck-file"
                  type="file"
                  accept=".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  required={auditType === "pitch_deck"}
                />
              </label>
            </div>
            <Button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="h-12 px-8 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Analyze Deck
                </div>
              )}
            </Button>
          </div>
          {selectedFile && (
            <p className="text-sm text-gray-600 mt-2">
              File size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </TabsContent>
      </Tabs>
    </form>
  );
}
