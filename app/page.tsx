"use client";
import { Snippet } from "@nextui-org/snippet";
import { Code } from "@nextui-org/code";
import { Icon } from "@iconify/react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  ScrollShadow,
  Select,
  SelectItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import clsx from "clsx";
import React, { useState, useEffect, useRef } from "react";

import { title } from "@/components/primitives";

interface Chapter {
  id: string;
  title: string;
  content: string;
  isEditing: boolean;
}

interface TextFile {
  name: string;
  content: string;
}

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [textFiles, setTextFiles] = useState<TextFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [textContent, setTextContent] = useState("");
  const [splitMarkers, setSplitMarkers] = useState<number[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 动态加载文本文件
  const loadTextFiles = async () => {
    try {
      // 首先获取文件列表
      const response = await fetch('/api/files?folder=public/story');
      const data = await response.json();
      
      if (data.success) {
        console.log(`找到 ${data.count} 个 txt 文件:`, data.files);
        
        // 然后加载每个文件的内容
        const loadedFiles: TextFile[] = [];
        for (const file of data.files) {
          try {
            const contentResponse = await fetch(file.path);
            if (contentResponse.ok) {
              const content = await contentResponse.text();
              loadedFiles.push({ 
                name: file.name, 
                content 
              });
            }
          } catch (error) {
            console.error(`Failed to load ${file.name}:`, error);
          }
        }
        setTextFiles(loadedFiles);
      } else {
        console.error('Failed to get file list:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch file list:', error);
    }
  };

  useEffect(() => {
    loadTextFiles();
  }, []);

  const cleanChapterContent = (content: string, chapterMarker: string): string => {
    let cleanedContent = content;
    
    if (chapterMarker) {
      const lines = cleanedContent.split('\n');
      const filteredLines = lines.filter((line, index) => {
        if (index === 0) return false;
        return true;
      });
    }
    
    cleanedContent = cleanedContent.replace(/---CHAPTER END---/g, '');
    
    const lines = cleanedContent.split('\n');
    let isNewParagraph = true;
    
    const processedLines = lines.map((line) => {
      if (line.trim() === '') {
        isNewParagraph = true;
        return '';
      }
      
      const trimmedLine = line.trimStart();
      
      let indentedLine = `      ${trimmedLine}`;
      
      return indentedLine;
    });
    
    cleanedContent = processedLines.join('\n');
    
    cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    cleanedContent = cleanedContent.trim();
    
    return cleanedContent;
  };

  const parseStoredStoryFormat = (content: string): Chapter[] => {
    const chapters: Chapter[] = [];
    
    const chapterPattern = /^(Chapter \d+ - .+)$/gm;
    const matches = Array.from(content.matchAll(chapterPattern));
    
    if (matches.length === 0) {
      return chapters;
    }
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const title = match[1].trim();
      const startIndex = match.index! + match[0].length;
      
      let endIndex: number;
      if (i < matches.length - 1) {
        endIndex = matches[i + 1].index!;
      } else {
        endIndex = content.length;
      }
      
      const chapterContent = content.substring(startIndex, endIndex).trim();
      
      if (chapterContent) {
        chapters.push({
          id: `chapter-${chapters.length + 1}`,
          title: title,
          content: chapterContent,
          isEditing: false
        });
      }
    }
    
    return chapters;
  };

  const autoDivideChapters = (content: string): Chapter[] => {
    const chapterPatterns = [
      /^Chapter\s+\d+[:\-]\s*(.+)$/gm,
      /^Chapter\s+\d+\s*$/gm,
      /^Chapter\s+[A-Za-z\s]+[:\-]\s*(.+)$/gm,
      /^Chapter\s+[A-Za-z\s]+$/gm,
      /^第\s*\d+\s*章[：\-]\s*(.+)$/gm,
      /^第\s*\d+\s*章\s*$/gm,
    ];

    // Appendix 识别模式
    const appendixPatterns = [
      /^Appendix\s+[A-Z]?[:\-]\s*(.+)$/gmi,
      /^Appendix\s+[A-Z]?\s*$/gmi,
      /^Appendix\s+\d+[:\-]\s*(.+)$/gmi,
      /^Appendix\s+\d+\s*$/gmi,
      /^Appendix[:\-]\s*(.+)$/gmi,
      /^Appendix\s*$/gmi,
      /^附录\s*[A-Z]?[：\-]\s*(.+)$/gmi,
      /^附录\s*[A-Z]?\s*$/gmi,
      /^附录\s*\d+[：\-]\s*(.+)$/gmi,
      /^附录\s*\d+\s*$/gmi,
    ];

    let chapters: Chapter[] = [];
    let appendices: Chapter[] = [];
    let currentContent = content;
    let chapterNumber = 1;
    let appendixNumber = 1;

    // 首先查找所有章节
    for (const pattern of chapterPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      if (matches.length > 0) {
        chapters = [];
        let lastIndex = 0;

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const startIndex = match.index!;
          let title = match[1] || match[0].trim();
          
          let endIndex = i < matches.length - 1 ? matches[i + 1].index! : content.length;
          
          const chapterEndPattern = /---CHAPTER END---/g;
          const chapterEndMatch = content.substring(startIndex).match(chapterEndPattern);
          if (chapterEndMatch) {
            const chapterEndIndex = startIndex + chapterEndMatch.index! + chapterEndMatch[0].length;
            if (chapterEndIndex < endIndex) {
              endIndex = chapterEndIndex;
            }
          }
          
          let chapterContent = content.substring(startIndex, endIndex).trim();

          if (!match[1] && title === match[0].trim()) {
            const lines = chapterContent.split('\n');
            if (lines.length > 1) {
              const firstLine = lines[1].trim();
              if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
                title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
              } else {
                title = `Chapter ${chapterNumber}`;
              }
            } else {
              title = `Chapter ${chapterNumber}`;
            }
          }

          chapterContent = cleanChapterContent(chapterContent, match[0]);

          chapters.push({
            id: `chapter-${chapterNumber}`,
            title: `Chapter ${chapterNumber} - ${title}`,
            content: chapterContent,
            isEditing: false,
          });

          lastIndex = endIndex;
          chapterNumber++;
        }

        if (lastIndex > 0 && content.substring(0, matches[0].index!).trim()) {
          const firstContent = content.substring(0, matches[0].index!).trim();
          chapters.unshift({
            id: "chapter-1",
            title: "Chapter 1 - Beginning",
            content: firstContent,
            isEditing: false,
          });
        }

        break;
      }
    }

    // 然后查找所有附录
    for (const pattern of appendixPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      if (matches.length > 0) {
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const startIndex = match.index!;
          let title = match[1] || match[0].trim();
          
          let endIndex = i < matches.length - 1 ? matches[i + 1].index! : content.length;
          
          // 检查是否有下一个章节或附录，如果有，以其开始位置为结束位置
          const remainingContent = content.substring(startIndex + match[0].length);
          const nextChapterMatch = chapterPatterns.concat(appendixPatterns).some(p => {
            const nextMatch = remainingContent.match(p);
            if (nextMatch && nextMatch.index !== undefined) {
              const nextIndex = startIndex + match[0].length + nextMatch.index;
              if (nextIndex < endIndex) {
                endIndex = nextIndex;
              }
              return true;
            }
            return false;
          });
          
          let appendixContent = content.substring(startIndex, endIndex).trim();

          if (!match[1] && title === match[0].trim()) {
            const lines = appendixContent.split('\n');
            if (lines.length > 1) {
              const firstLine = lines[1].trim();
              if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
                title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
              } else {
                title = `Appendix ${appendixNumber}`;
              }
            } else {
              title = `Appendix ${appendixNumber}`;
            }
          }

          appendixContent = cleanChapterContent(appendixContent, match[0]);

          appendices.push({
            id: `appendix-${appendixNumber}`,
            title: `Appendix ${appendixNumber} - ${title}`,
            content: appendixContent,
            isEditing: false,
          });

          appendixNumber++;
        }
        break;
      }
    }

    // 如果没有找到任何章节，创建默认章节
    if (chapters.length === 0 && appendices.length === 0) {
      chapters = [{
        id: "chapter-1",
        title: "Chapter 1 - Beginning",
        content: content.trim(),
        isEditing: false,
      }];
    }

    // 合并章节和附录
    return [...chapters, ...appendices];
  };

  const importTextFile = (fileName: string) => {
    const file = textFiles.find(f => f.name === fileName);
    if (file) {
      // 检查文件是否为空
      if (!file.content || file.content.trim() === '') {
        alert('当前文件为空，无法导入。');
        return;
      }
      
      let newChapters: Chapter[] = [];
      
      const storedFormatPattern = /^Chapter \d+ - .+$/gm;
      const storedFormatMatches = file.content.match(storedFormatPattern);
      
      if (storedFormatMatches && storedFormatMatches.length > 0) {
        newChapters = parseStoredStoryFormat(file.content);
      } else {
        newChapters = autoDivideChapters(file.content);
      }
      
      const chaptersWithUpdatedNumbers = updateChapterNumbers(newChapters);
      setChapters(chaptersWithUpdatedNumbers);
      setSelectedFile(fileName);
      if (chaptersWithUpdatedNumbers.length > 0) {
        setSelectedChapter(chaptersWithUpdatedNumbers[0]);
        setTextContent(chaptersWithUpdatedNumbers[0].content);
        setChapters(prev => prev.map((c, index) => 
          index === 0 ? { ...c, isEditing: true } : c
        ));
      }
    }
  };

  const insertChapterSplit = () => {
    if (!textareaRef.current || !selectedChapter) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const content = textarea.value;
    
    setUndoStack(prev => [...prev, content]);
    setRedoStack([]);

    const newContent = content.slice(0, cursorPosition) + "\n====SPLIT CHAPTER====\n" + content.slice(cursorPosition);
    setTextContent(newContent);
    textarea.value = newContent;
    
    const newPosition = cursorPosition + "\n====SPLIT CHAPTER====\n".length;
    textarea.setSelectionRange(newPosition, newPosition);
    textarea.focus();

    setSplitMarkers(prev => [...prev, cursorPosition]);
    
    if (selectedChapter) {
      setChapters(prev => prev.map(c => 
        c.id === selectedChapter.id ? { ...c, isEditing: true } : c
      ));
    }
  };

  const undo = () => {
    if (undoStack.length === 0) return;

    const currentContent = textareaRef.current?.value || "";
    setRedoStack(prev => [...prev, currentContent]);

    const previousContent = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    setTextContent(previousContent);
    if (textareaRef.current) {
      textareaRef.current.value = previousContent;
    }
    
    if (selectedChapter) {
      setChapters(prev => prev.map(c => 
        c.id === selectedChapter.id ? { ...c, isEditing: true } : c
      ));
    }
  };

  // 执行章节拆分
  const splitChapter = () => {
    if (!selectedChapter || splitMarkers.length === 0) return;

    const content = textContent;
    const markers = content.split("====SPLIT CHAPTER====");
    
    if (markers.length <= 1) return;

    const newChapters: Chapter[] = [];
    const currentChapterIndex = chapters.findIndex(c => c.id === selectedChapter.id);

    // 创建新章节
    for (let i = 0; i < markers.length; i++) {
      const chapterContent = markers[i].trim();
      if (chapterContent) {
        const newChapter: Chapter = {
          id: `chapter-${Date.now()}-${i}`,
          title: `Chapter ${currentChapterIndex + 1 + i} - Part ${i + 1}`,
          content: chapterContent,
          isEditing: false,
        };
        newChapters.push(newChapter);
      }
    }

    const updatedChapters = [...chapters];
    updatedChapters.splice(currentChapterIndex, 1, ...newChapters);
    
    const chaptersWithUpdatedNumbers = updateChapterNumbers(updatedChapters);
    setChapters(chaptersWithUpdatedNumbers);

    if (newChapters.length > 0) {
      const updatedFirstChapter = chaptersWithUpdatedNumbers.find(c => c.id === newChapters[0].id);
      if (updatedFirstChapter) {
        setSelectedChapter(updatedFirstChapter);
        setTextContent(updatedFirstChapter.content);
        setChapters(prev => prev.map(c => 
          c.id === newChapters[0].id ? { ...c, isEditing: true } : c
        ));
      }
    }

    setSplitMarkers([]);
    setUndoStack([]);
    setRedoStack([]);
  };

  // 与下一章节合并
  const combineWithNextChapter = (chapterId: string) => {
    const currentIndex = chapters.findIndex(c => c.id === chapterId);
    if (currentIndex === -1 || currentIndex === chapters.length - 1) return;

    const currentChapter = chapters[currentIndex];
    const nextChapter = chapters[currentIndex + 1];

    const combinedContent = currentChapter.content + "\n\n" + nextChapter.content;
    const combinedChapter: Chapter = {
      id: currentChapter.id,
      title: currentChapter.title,
      content: combinedContent,
      isEditing: currentChapter.isEditing,
    };

    const updatedChapters = [...chapters];
    updatedChapters.splice(currentIndex, 2, combinedChapter);
    
    // 更新章节号
    const chaptersWithUpdatedNumbers = updateChapterNumbers(updatedChapters);
    setChapters(chaptersWithUpdatedNumbers);

    if (selectedChapter?.id === chapterId || selectedChapter?.id === nextChapter.id) {
      const updatedCombinedChapter = chaptersWithUpdatedNumbers.find(c => c.id === combinedChapter.id);
      if (updatedCombinedChapter) {
        setSelectedChapter(updatedCombinedChapter);
        setTextContent(combinedContent);
        // 设置合并后的章节为编辑状态
        setChapters(prev => prev.map(c => 
          c.id === combinedChapter.id ? { ...c, isEditing: true } : c
        ));
      }
    }
  };

  // 删除章节
  const deleteChapter = (chapterId: string) => {
    const updatedChapters = chapters.filter(c => c.id !== chapterId);
    
    // 更新章节号
    const chaptersWithUpdatedNumbers = updateChapterNumbers(updatedChapters);
    setChapters(chaptersWithUpdatedNumbers);

    if (selectedChapter?.id === chapterId) {
      if (chaptersWithUpdatedNumbers.length > 0) {
        setSelectedChapter(chaptersWithUpdatedNumbers[0]);
        setTextContent(chaptersWithUpdatedNumbers[0].content);
        // 设置第一个章节为编辑状态
        setChapters(prev => prev.map((c, index) => 
          index === 0 ? { ...c, isEditing: true } : c
        ));
      } else {
        setSelectedChapter(null);
        setTextContent("");
      }
    }
  };

  // 选择章节
  const selectChapter = (chapter: Chapter) => {
    setChapters(prev => prev.map(c => ({ ...c, isEditing: false })));
    // 设置选中的章节为编辑状态
    setChapters(prev => prev.map(c => 
      c.id === chapter.id ? { ...c, isEditing: true } : c
    ));
    setSelectedChapter(chapter);
    setTextContent(chapter.content);
    setSplitMarkers([]);
    setUndoStack([]);
    setRedoStack([]);
  };

  // 更新章节内容
  const updateChapterContent = (content: string) => {
    setTextContent(content);
    if (selectedChapter) {
      setChapters(prev => prev.map(c => 
        c.id === selectedChapter.id ? { ...c, content, isEditing: true } : c
      ));
    }
  };

  // 更新章节标题中的章节号
  const updateChapterNumbers = (chaptersToUpdate: Chapter[]) => {
    return chaptersToUpdate.map((chapter, index) => {
      // 提取原标题中除了章节号之外的部分
      const titleWithoutNumber = chapter.title.replace(/^Chapter \d+\s*-?\s*/, '');
      const newTitle = titleWithoutNumber 
        ? `Chapter ${index + 1} - ${titleWithoutNumber}`
        : `Chapter ${index + 1}`;
      
      return {
        ...chapter,
        title: newTitle
      };
    });
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // 检查文件是否为空
        if (!content || content.trim() === '') {
          alert('当前文件为空，无法导入。');
          return;
        }
        
        setSelectedFile(file.name);
        const newChapters = autoDivideChapters(content);
        const chaptersWithUpdatedNumbers = updateChapterNumbers(newChapters);
        setChapters(chaptersWithUpdatedNumbers);
        
        if (chaptersWithUpdatedNumbers.length > 0) {
          setSelectedChapter(chaptersWithUpdatedNumbers[0]);
          setTextContent(chaptersWithUpdatedNumbers[0].content);
          setChapters(prev => prev.map((c, index) => 
            index === 0 ? { ...c, isEditing: true } : c
          ));
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid .txt file');
    }
    
    // 清除文件输入值，允许重复选择同一文件
    event.target.value = '';
  };

  // 保存故事到服务器
  const saveStoryToServer = async () => {
    if (!selectedFile || chapters.length === 0) {
      alert('No story to save');
      return;
    }

    try {
      const response = await fetch('/api/save-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyName: selectedFile,
          chapters: chapters
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Story saved successfully as ${result.fileName}`);
        loadTextFiles();
      } else {
        alert(`Failed to save story: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving story:', error);
      alert('Failed to save story');
    }
  };

      return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="w-64">
          <Select
            label="Story"
            placeholder="Select a story"
            selectedKeys={selectedFile ? [selectedFile] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              if (selected) {
                importTextFile(selected);
              }
            }}
          >
            {textFiles.map((file) => (
              <SelectItem key={file.name} value={file.name}>
                {file.name}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="w-full max-w-7xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                <Button
                  size="sm"
                  variant="flat"
                  className="bg-transparent"
                  onPress={handleFileSelect}>
                  Import txt
                </Button>
              </div>
              <div className="flex gap-2">      
                <Button
                  size="sm"
                  variant="flat"
                  className="bg-default"
                  startContent={<Icon icon="ic:round-cloud-done" width={16} />}
                  isDisabled={!selectedFile || chapters.length === 0}
                  onPress={saveStoryToServer}
                >
                  Finish import
                </Button>
              </div>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="p-6">
            <div className="flex flex-row gap-4">
          {/* 左侧章节列表 */}
          <div className="w-96 flex-shrink-0">
            <header className="flex items-center text-md font-medium text-default-500 mb-4">
              <Icon
                className="text-default-500 mr-2"
                icon="solar:clipboard-text-outline"
                width={24}
              />
              Chapters
            </header>
            <ScrollShadow className="max-h-[600px]">
              <div className="flex flex-col gap-4">
                {chapters.map((chapter) => (
                  <Card
                    key={chapter.id}
                    isPressable
                    className={clsx(
                      "max-w-[384px] border-1 border-divider/15",
                      chapter.isEditing && "bg-themeBlue/20"
                    )}
                    shadow="none"
                    onPress={() => selectChapter(chapter)}
                  >
                    <CardHeader className="flex items-center justify-between">
                      <div className="flex gap-1.5 items-center">
                        {chapter.isEditing && (
                          <Chip
                            className="mr-1 text-themeBlue bg-themeBlue/20"
                            radius="sm"
                            size="sm"
                            variant="flat"
                          >
                            Editing
                          </Chip>
                        )}
                        <p className="text-left mr-1 text-sm">
                          {chapter.title}
                        </p>
                      </div>
                      <Dropdown>
                        <DropdownTrigger>
                          <Button 
                            isIconOnly 
                            size="sm" 
                            variant="light"
                          >
                            <Icon icon="solar:menu-dots-bold" width={16} />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu 
                          aria-label="Chapter actions"
                        >
                          <DropdownItem
                            key="action-header"
                            className="h-8 text-xs font-semibold text-default-500 cursor-default"
                            isReadOnly
                          >
                            Action
                          </DropdownItem>
                          <DropdownItem
                            key="combine-next"
                            startContent={<Icon icon="iconoir:vertical-merge" width={16} />}
                            onPress={() => combineWithNextChapter(chapter.id)}
                            isDisabled={chapters.indexOf(chapter) === chapters.length - 1}
                            description="Combine this chapter with the next one"
                          >
                            Combine with next chapter
                          </DropdownItem>
                          <DropdownItem
                            key="danger-header"
                            className="h-8 text-xs font-semibold text-default-500 cursor-default mt-2"
                            isReadOnly
                          >
                            Danger Zone
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            startContent={<Icon icon="solar:trash-bin-trash-bold" width={16} />}
                            onPress={() => deleteChapter(chapter.id)}
                            description="Permanently delete this chapter"
                          >
                            Delete this chapter
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <p className="line-clamp-2 text-xs text-default-500">
                        {chapter.content.substring(0, 100)}...
                      </p>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </ScrollShadow>
          </div>

          <div className="w-px bg-divider mx-4"></div>

          <div className="flex-1 min-w-[600px]">
            <div className="flex flex-col">
              <header className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <Icon icon="solar:sidebar-minimalistic-outline" width={24} />
                  <h4 className="text-md">
                    {selectedChapter ? selectedChapter.title : "No chapter selected"}
                  </h4>
                </div>
              </header>
              
              <div className="w-full">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col items-start">
                    <div className="relative w-full h-[500px] bg-default-100 rounded-lg">
                      <div className="absolute inset-x-4 top-4 z-10 flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            startContent={<Icon icon="fluent:split-horizontal-12-filled" width={16} />}
                            onPress={insertChapterSplit}
                            isDisabled={!selectedChapter}
                          >
                            Insert chapter split
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            startContent={<Icon icon="material-symbols:undo" width={16} />}
                            onPress={undo}
                            isDisabled={undoStack.length === 0}
                          >
                            Undo
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<Icon icon="ph:split-vertical" width={16} />}
                          onPress={splitChapter}
                          isDisabled={splitMarkers.length === 0}
                        >
                          Split
                        </Button>
                      </div>
                      
                      <div className="absolute inset-4 top-16 ">
                        <textarea
                          ref={textareaRef}
                          className="w-full h-full p-4 resize-none rounded-md border border-transparent text-gray-900 bg-default-100 text-sm"
                          value={textContent}
                          onChange={(e) => updateChapterContent(e.target.value)}
                          placeholder="Chapter content will appear here..."
                          disabled={!selectedChapter}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
