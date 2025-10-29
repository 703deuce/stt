'use client';

import React, { useState } from 'react';
import { X, Download, FileText, File, FileVideo } from 'lucide-react';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface DiarizedSegment {
  speaker: string;
  start_time: number;
  end_time: number;
  text: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcription: {
    name?: string;
    transcript?: string;
    diarized_transcript?: DiarizedSegment[];
    timestamps?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
    duration?: number;
    metadata?: any;
  };
  getSpeakerDisplayName: (speaker: string) => string;
}

type DownloadFormat = 'pdf' | 'docx' | 'txt' | 'srt' | 'vtt';

export default function DownloadModal({
  isOpen,
  onClose,
  transcription,
  getSpeakerDisplayName,
}: DownloadModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>('txt');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeSpeakers, setIncludeSpeakers] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  // Subtitle-specific settings
  const [maxWordsPerSegment, setMaxWordsPerSegment] = useState(15);
  const [maxDurationPerSegment, setMaxDurationPerSegment] = useState(5);
  const [maxCharsPerSegment, setMaxCharsPerSegment] = useState(42);
  const [sentenceAwareSegmentation, setSentenceAwareSegmentation] = useState(true);

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const formatVTTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const createSubtitleSegments = () => {
    if (!transcription.diarized_transcript || transcription.diarized_transcript.length === 0) {
      return [];
    }

    const segments: Array<{ start: number; end: number; text: string; speaker?: string }> = [];

    transcription.diarized_transcript.forEach((segment) => {
      const words = segment.words || [];
      if (words.length === 0) {
        // Fallback: use segment-level timing
        segments.push({
          start: segment.start_time,
          end: segment.end_time,
          text: segment.text,
          speaker: getSpeakerDisplayName(segment.speaker),
        });
        return;
      }

      let currentSegment: { start: number; end: number; words: string[]; speaker: string } | null = null;

      words.forEach((word, index) => {
        if (!currentSegment) {
          currentSegment = {
            start: word.start,
            end: word.end,
            words: [word.word],
            speaker: getSpeakerDisplayName(segment.speaker),
          };
        } else {
          const duration = word.end - currentSegment.start;
          const wordCount = currentSegment.words.length;
          const text = [...currentSegment.words, word.word].join(' ');
          const charCount = text.length;

          // Check if we need to start a new segment
          const shouldBreak =
            wordCount >= maxWordsPerSegment ||
            duration >= maxDurationPerSegment ||
            charCount >= maxCharsPerSegment ||
            (sentenceAwareSegmentation && /[.!?]$/.test(word.word));

          if (shouldBreak) {
            // Save current segment
            segments.push({
              start: currentSegment.start,
              end: currentSegment.end,
              text: currentSegment.words.join(' '),
              speaker: currentSegment.speaker,
            });

            // Start new segment
            currentSegment = {
              start: word.start,
              end: word.end,
              words: [word.word],
              speaker: getSpeakerDisplayName(segment.speaker),
            };
          } else {
            // Add word to current segment
            currentSegment.words.push(word.word);
            currentSegment.end = word.end;
          }
        }
      });

      // Add remaining segment
      if (currentSegment) {
        segments.push({
          start: currentSegment.start,
          end: currentSegment.end,
          text: currentSegment.words.join(' '),
          speaker: currentSegment.speaker,
        });
      }
    });

    return segments;
  };

  const generateTXT = () => {
    let content = '';

    if (includeMetadata) {
      content += `TRANSCRIPT: ${transcription.name || 'Untitled'}\n`;
      if (transcription.duration) {
        content += `Duration: ${formatTime(transcription.duration)}\n`;
      }
      content += `\n${'='.repeat(50)}\n\n`;
    }

    if (transcription.diarized_transcript && transcription.diarized_transcript.length > 0 && includeSpeakers) {
      transcription.diarized_transcript.forEach((segment) => {
        if (includeTimestamps) {
          content += `${getSpeakerDisplayName(segment.speaker)} [${formatTime(segment.start_time)} - ${formatTime(segment.end_time)}]:\n`;
        } else {
          content += `${getSpeakerDisplayName(segment.speaker)}:\n`;
        }
        content += `${segment.text}\n\n`;
      });
    } else {
      content += transcription.transcript || 'No transcript available';
    }

    return content;
  };

  const generateSRT = () => {
    const segments = createSubtitleSegments();
    let content = '';

    segments.forEach((segment, index) => {
      content += `${index + 1}\n`;
      content += `${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)}\n`;
      if (includeSpeakers && segment.speaker) {
        content += `${segment.speaker}: ${segment.text}\n\n`;
      } else {
        content += `${segment.text}\n\n`;
      }
    });

    return content;
  };

  const generateVTT = () => {
    const segments = createSubtitleSegments();
    let content = 'WEBVTT\n\n';

    segments.forEach((segment, index) => {
      content += `${index + 1}\n`;
      content += `${formatVTTTime(segment.start)} --> ${formatVTTTime(segment.end)}\n`;
      if (includeSpeakers && segment.speaker) {
        content += `${segment.speaker}: ${segment.text}\n\n`;
      } else {
        content += `${segment.text}\n\n`;
      }
    });

    return content;
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Title (with wrapping support)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(transcription.name || 'Transcript', maxWidth);
    titleLines.forEach((line: string) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 8;
    });
    yPosition += 2;

    // Metadata
    if (includeMetadata) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (transcription.duration) {
        doc.text(`Duration: ${formatTime(transcription.duration)}`, margin, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // Transcript content
    doc.setFontSize(11);

    if (transcription.diarized_transcript && transcription.diarized_transcript.length > 0 && includeSpeakers) {
      transcription.diarized_transcript.forEach((segment) => {
        // Check for page break
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }

        // Speaker and timestamp
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246); // Blue color
        let header = getSpeakerDisplayName(segment.speaker);
        if (includeTimestamps) {
          header += ` [${formatTime(segment.start_time)} - ${formatTime(segment.end_time)}]`;
        }
        doc.text(header, margin, yPosition);
        yPosition += 6;

        // Text
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(segment.text, maxWidth);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      });
    } else {
      doc.setFont('helvetica', 'normal');
      const text = transcription.transcript || 'No transcript available';
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
    }

    return doc;
  };

  const generateDOCX = async () => {
    const paragraphs: Paragraph[] = [];

    // Title
    paragraphs.push(
      new Paragraph({
        text: transcription.name || 'Transcript',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );

    // Metadata
    if (includeMetadata && transcription.duration) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Duration: ${formatTime(transcription.duration)}`,
              size: 20,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Transcript content
    if (transcription.diarized_transcript && transcription.diarized_transcript.length > 0 && includeSpeakers) {
      transcription.diarized_transcript.forEach((segment) => {
        // Speaker header
        let header = getSpeakerDisplayName(segment.speaker);
        if (includeTimestamps) {
          header += ` [${formatTime(segment.start_time)} - ${formatTime(segment.end_time)}]`;
        }

        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: header,
                bold: true,
                color: '3B82F6',
                size: 22,
              }),
            ],
            spacing: { before: 100, after: 100 },
          })
        );

        // Text
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: segment.text,
                size: 22,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      });
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: transcription.transcript || 'No transcript available',
              size: 22,
            }),
          ],
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    return doc;
  };

  const handleDownload = async () => {
    const fileName = (transcription.name || 'transcript').replace(/\.[^/.]+$/, '');

    try {
      switch (selectedFormat) {
        case 'txt':
          const txtContent = generateTXT();
          const txtBlob = new Blob([txtContent], { type: 'text/plain' });
          saveAs(txtBlob, `${fileName}.txt`);
          break;

        case 'srt':
          const srtContent = generateSRT();
          const srtBlob = new Blob([srtContent], { type: 'text/plain' });
          saveAs(srtBlob, `${fileName}.srt`);
          break;

        case 'vtt':
          const vttContent = generateVTT();
          const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
          saveAs(vttBlob, `${fileName}.vtt`);
          break;

        case 'pdf':
          const pdf = await generatePDF();
          pdf.save(`${fileName}.pdf`);
          break;

        case 'docx':
          const docx = await generateDOCX();
          const blob = await Packer.toBlob(docx);
          saveAs(blob, `${fileName}.docx`);
          break;
      }

      onClose();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to generate download. Please try again.');
    }
  };

  const isSubtitleFormat = selectedFormat === 'srt' || selectedFormat === 'vtt';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Download Transcript</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Format</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { value: 'txt', label: 'TXT', icon: FileText },
                { value: 'pdf', label: 'PDF', icon: File },
                { value: 'docx', label: 'DOCX', icon: File },
                { value: 'srt', label: 'SRT', icon: FileVideo },
                { value: 'vtt', label: 'VTT', icon: FileVideo },
              ].map((format) => (
                <button
                  key={format.value}
                  onClick={() => setSelectedFormat(format.value as DownloadFormat)}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    selectedFormat === format.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <format.icon className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">{format.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* General Options (not for subtitles) */}
          {!isSubtitleFormat && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Options</h3>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">Include Metadata</label>
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
              </div>

              {transcription.diarized_transcript && transcription.diarized_transcript.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">Include Speaker Names</label>
                    <input
                      type="checkbox"
                      checked={includeSpeakers}
                      onChange={(e) => setIncludeSpeakers(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">Include Timestamps</label>
                    <input
                      type="checkbox"
                      checked={includeTimestamps}
                      onChange={(e) => setIncludeTimestamps(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Subtitle-Specific Settings */}
          {isSubtitleFormat && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700">Subtitle Segmentation Settings</h3>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">Include Speaker Names</label>
                <input
                  type="checkbox"
                  checked={includeSpeakers}
                  onChange={(e) => setIncludeSpeakers(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Max Words Per Segment: <span className="font-medium text-gray-900">{maxWordsPerSegment}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={maxWordsPerSegment}
                  onChange={(e) => setMaxWordsPerSegment(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5</span>
                  <span>30</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Max Duration Per Segment: <span className="font-medium text-gray-900">{maxDurationPerSegment}s</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={maxDurationPerSegment}
                  onChange={(e) => setMaxDurationPerSegment(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2s</span>
                  <span>10s</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Max Characters Per Segment: <span className="font-medium text-gray-900">{maxCharsPerSegment}</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={maxCharsPerSegment}
                  onChange={(e) => setMaxCharsPerSegment(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>20</span>
                  <span>100</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input
                    id="sentence-aware"
                    type="checkbox"
                    checked={sentenceAwareSegmentation}
                    onChange={(e) => setSentenceAwareSegmentation(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="sentence-aware" className="block text-sm font-medium text-gray-700 cursor-pointer">
                      Sentence-Aware Segmentation
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      If enabled, the start of a new sentence will always begin a new segment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Download className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Download Information</p>
                <p className="text-xs mt-1">
                  {selectedFormat === 'txt' && 'Plain text format, compatible with all text editors.'}
                  {selectedFormat === 'pdf' && 'PDF format with formatting and speaker labels.'}
                  {selectedFormat === 'docx' && 'Microsoft Word format with full formatting.'}
                  {selectedFormat === 'srt' && 'SubRip subtitle format, compatible with most video players.'}
                  {selectedFormat === 'vtt' && 'WebVTT subtitle format, ideal for web videos.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download {selectedFormat.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

