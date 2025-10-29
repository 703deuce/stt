'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { contentService, ContentRecord } from '@/services/contentService';
import RichTextEditor from '@/components/RichTextEditor';
import showdown from 'showdown';
import TurndownService from 'turndown';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import {
  ArrowLeft,
  Save,
  Copy,
  Download,
  Trash2,
  FileText,
  Calendar,
  Type,
  Hash,
  CheckCircle,
  AlertCircle,
  ChevronDown
} from 'lucide-react';

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const contentId = params.id as string;

  const [content, setContent] = useState<ContentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    if (user && contentId) {
      loadContent();
    }
  }, [user, contentId]);

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDownloadMenu && !target.closest('.download-menu-container')) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadMenu]);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const record = await contentService.getContentRecordById(contentId);
      
      if (record) {
        setContent(record);
        setEditTitle(record.title);
        
        // Convert markdown to HTML for WYSIWYG editing
        const converter = new showdown.Converter();
        const html = converter.makeHtml(record.content);
        setEditContent(html);
      } else {
        setError('Content not found');
      }
    } catch (err) {
      console.error('Error loading content:', err);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!content) return;

    try {
      setSaving(true);
      
      // Convert HTML back to markdown for storage
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      });
      const markdown = turndownService.turndown(editContent);
      
      await contentService.updateContentRecord(contentId, {
        title: editTitle.trim(),
        content: markdown.trim()
      });

      // Update local state with markdown
      setContent(prev => prev ? {
        ...prev,
        title: editTitle.trim(),
        content: markdown.trim(),
        word_count: markdown.trim().split(/\s+/).filter(Boolean).length,
        character_count: markdown.trim().length
      } : null);

      console.log('✅ Content saved successfully');
    } catch (err) {
      console.error('Error saving content:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const deleteContent = async () => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      await contentService.deleteContentRecord(contentId);
      router.push('/my-content');
    } catch (err) {
      console.error('Error deleting content:', err);
      setError('Failed to delete content');
    }
  };

  const copyToClipboard = () => {
    // Convert current HTML content to markdown for copying
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    const markdown = turndownService.turndown(editContent);
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsTxt = () => {
    if (!content) return;

    // Convert HTML to plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    const blob = new Blob([`${editTitle}\n\n${plainText}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editTitle.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const downloadAsDocx = async () => {
    if (!content) return;

    try {
      // Convert HTML to markdown first
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      });
      const markdown = turndownService.turndown(editContent);

      // Parse markdown and convert to DOCX paragraphs
      const lines = markdown.split('\n');
      const paragraphs: any[] = [];

      for (const line of lines) {
        if (!line.trim()) {
          paragraphs.push(new Paragraph({ text: '' }));
          continue;
        }

        // Headings
        if (line.startsWith('# ')) {
          paragraphs.push(new Paragraph({
            text: line.substring(2),
            heading: HeadingLevel.HEADING_1,
          }));
        } else if (line.startsWith('## ')) {
          paragraphs.push(new Paragraph({
            text: line.substring(3),
            heading: HeadingLevel.HEADING_2,
          }));
        } else if (line.startsWith('### ')) {
          paragraphs.push(new Paragraph({
            text: line.substring(4),
            heading: HeadingLevel.HEADING_3,
          }));
        } else if (line.startsWith('#### ')) {
          paragraphs.push(new Paragraph({
            text: line.substring(5),
            heading: HeadingLevel.HEADING_4,
          }));
        } else {
          // Regular text with bold/italic support
          const textRuns: TextRun[] = [];
          const boldRegex = /\*\*(.*?)\*\*/g;
          const italicRegex = /\*(.*?)\*/g;
          
          let lastIndex = 0;
          let match;
          let processedText = line;

          // Simple bold processing
          const parts = processedText.split(/(\*\*.*?\*\*|\*.*?\*)/);
          for (const part of parts) {
            if (part.startsWith('**') && part.endsWith('**')) {
              textRuns.push(new TextRun({
                text: part.substring(2, part.length - 2),
                bold: true,
              }));
            } else if (part.startsWith('*') && part.endsWith('*')) {
              textRuns.push(new TextRun({
                text: part.substring(1, part.length - 1),
                italics: true,
              }));
            } else if (part) {
              textRuns.push(new TextRun({ text: part }));
            }
          }

          paragraphs.push(new Paragraph({
            children: textRuns.length > 0 ? textRuns : [new TextRun({ text: line })],
          }));
        }
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${editTitle.replace(/[^a-z0-9]/gi, '_')}.docx`);
      setShowDownloadMenu(false);
    } catch (err) {
      console.error('Error generating DOCX:', err);
      alert('Failed to generate DOCX file');
    }
  };

  const downloadAsPdf = () => {
    if (!content) return;

    try {
      // Convert HTML to markdown first
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      });
      const markdown = turndownService.turndown(editContent);

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(editTitle, maxWidth);
      pdf.text(titleLines, margin, yPosition);
      yPosition += titleLines.length * 10 + 10;

      // Content
      const lines = markdown.split('\n');
      
      for (const line of lines) {
        if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        if (!line.trim()) {
          yPosition += 5;
          continue;
        }

        // Headings
        if (line.startsWith('# ')) {
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          const text = line.substring(2);
          const textLines = pdf.splitTextToSize(text, maxWidth);
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * 8 + 5;
        } else if (line.startsWith('## ')) {
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          const text = line.substring(3);
          const textLines = pdf.splitTextToSize(text, maxWidth);
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * 7 + 4;
        } else if (line.startsWith('### ')) {
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          const text = line.substring(4);
          const textLines = pdf.splitTextToSize(text, maxWidth);
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * 6 + 4;
        } else {
          // Regular text
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          const cleanText = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
          const textLines = pdf.splitTextToSize(cleanText, maxWidth);
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * 5 + 3;
        }
      }

      pdf.save(`${editTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      setShowDownloadMenu(false);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF file');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="p-6 max-w-5xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading content...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !content) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="p-6 max-w-5xl mx-auto">
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
              <p className="text-gray-600 mb-4">{error || 'Content not found'}</p>
              <button
                onClick={() => router.push('/my-content')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to My Content
              </button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/my-content')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Content
            </button>

            <div className="flex-1">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-3xl font-bold text-gray-900 border-b-2 border-gray-200 focus:outline-none focus:border-purple-600 pb-2 bg-transparent hover:border-gray-300 transition-colors"
                placeholder="Enter title..."
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">Type</div>
                <div className="text-sm font-medium text-gray-900">{content.content_type_name}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">Created</div>
                <div className="text-sm font-medium text-gray-900">{formatDate(content.timestamp)}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Type className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">Words</div>
                <div className="text-sm font-medium text-gray-900">{content.word_count || 0}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">Characters</div>
                <div className="text-sm font-medium text-gray-900">{content.character_count || 0}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 mb-6">
            <button
              onClick={saveChanges}
              disabled={saving}
              className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </button>
            <div className="relative download-menu-container">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="inline-flex items-center border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>

              {/* Download Format Menu */}
              {showDownloadMenu && (
                <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                  <button
                    onClick={downloadAsTxt}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download as TXT
                  </button>
                  <button
                    onClick={downloadAsDocx}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download as DOCX
                  </button>
                  <button
                    onClick={downloadAsPdf}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700 flex items-center rounded-b-lg"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download as PDF
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={deleteContent}
              className="inline-flex items-center border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>

          {/* WYSIWYG Editor - Always Editable */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <RichTextEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="Start typing your content..."
              />
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-xs text-purple-900 font-medium mb-2">✨ Editor Shortcuts:</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-700">
                  <div>• <strong>Ctrl+B</strong>: Bold</div>
                  <div>• <strong>Ctrl+I</strong>: Italic</div>
                  <div>• <strong>Ctrl+U</strong>: Underline</div>
                  <div>• <strong>Ctrl+Z</strong>: Undo</div>
                  <div>• <strong>Ctrl+Shift+Z</strong>: Redo</div>
                  <div>• Select text to format</div>
                  <div>• Use toolbar dropdowns</div>
                  <div>• Auto-saves on click "Save"</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

