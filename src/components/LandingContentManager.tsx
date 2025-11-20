import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, FileText } from "lucide-react";

type ContentSection = {
  id: string;
  section_key: string;
  heading: string | null;
  subheading: string | null;
  body_text: string | null;
  image_url: string | null;
  updated_at: string;
};

const SECTION_LABELS: Record<string, string> = {
  hero_title: "Hero Title",
  hero_subtitle: "Hero Subtitle",
  hero_description: "Hero Description",
  benefit_1_title: "Benefit 1 Title",
  benefit_2_title: "Benefit 2 Title",
  benefit_3_title: "Benefit 3 Title",
  about_heading: "About Section Heading",
  about_body: "About Section Body",
};

export const LandingContentManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [editedSections, setEditedSections] = useState<Record<string, Partial<ContentSection>>>({});

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("landing_content")
        .select("*")
        .order("section_key");

      if (error) throw error;
      setSections(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading content",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (sectionKey: string, field: keyof ContentSection, value: string) => {
    setEditedSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value,
      },
    }));
  };

  const handleSave = async (sectionKey: string) => {
    setSaving(true);
    try {
      const updates = editedSections[sectionKey];
      if (!updates) return;

      const { error } = await supabase
        .from("landing_content")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("section_key", sectionKey);

      if (error) throw error;

      toast({
        title: "Content updated",
        description: "Landing page content has been saved successfully.",
      });

      // Remove from edited sections
      setEditedSections(prev => {
        const { [sectionKey]: _, ...rest } = prev;
        return rest;
      });

      // Reload content
      await loadContent();
    } catch (error: any) {
      toast({
        title: "Error saving content",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCurrentValue = (section: ContentSection, field: keyof ContentSection): string => {
    const edited = editedSections[section.section_key];
    if (edited && edited[field] !== undefined) {
      return edited[field] as string;
    }
    return (section[field] as string) || "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Landing Page Content</h3>
          <p className="text-sm text-muted-foreground">
            Edit the content that appears on your landing page
          </p>
        </div>
      </div>

      {sections.map((section) => {
        const hasChanges = !!editedSections[section.section_key];
        
        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{SECTION_LABELS[section.section_key] || section.section_key}</CardTitle>
              <CardDescription>
                Last updated: {new Date(section.updated_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.heading !== null && (
                <div className="space-y-2">
                  <Label htmlFor={`${section.section_key}-heading`}>Heading</Label>
                  <Input
                    id={`${section.section_key}-heading`}
                    value={getCurrentValue(section, "heading")}
                    onChange={(e) => handleFieldChange(section.section_key, "heading", e.target.value)}
                    placeholder="Enter heading text"
                  />
                </div>
              )}

              {section.subheading !== null && (
                <div className="space-y-2">
                  <Label htmlFor={`${section.section_key}-subheading`}>Subheading</Label>
                  <Input
                    id={`${section.section_key}-subheading`}
                    value={getCurrentValue(section, "subheading")}
                    onChange={(e) => handleFieldChange(section.section_key, "subheading", e.target.value)}
                    placeholder="Enter subheading text"
                  />
                </div>
              )}

              {section.body_text !== null && (
                <div className="space-y-2">
                  <Label htmlFor={`${section.section_key}-body`}>Body Text</Label>
                  <Textarea
                    id={`${section.section_key}-body`}
                    value={getCurrentValue(section, "body_text")}
                    onChange={(e) => handleFieldChange(section.section_key, "body_text", e.target.value)}
                    placeholder="Enter body text"
                    rows={4}
                  />
                </div>
              )}

              {hasChanges && (
                <Button 
                  onClick={() => handleSave(section.section_key)}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
