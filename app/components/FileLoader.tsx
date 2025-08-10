"use client";
import { useState, useEffect } from 'react';
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from '@nextui-org/react';
import { Icon } from '@iconify/react';

interface FileInfo {
  name: string;
  size: number;
  path: string;
  fullPath: string;
  modified: string;
}

interface FileLoaderProps {
  onFileSelect: (fileName: string, content: string) => void;
}

export default function FileLoader({ onFileSelect }: FileLoaderProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recursive, setRecursive] = useState(false);

  // 加载文件列表
  const loadFiles = async (recursiveMode: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/files?recursive=${recursiveMode}`);
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files);
        console.log(`找到 ${data.count} 个 txt 文件`);
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载文件内容
  const loadFileContent = async (file: FileInfo) => {
    try {
      const response = await fetch(file.path);
      if (response.ok) {
        const content = await response.text();
        onFileSelect(file.name, content);
      } else {
        setError(`Failed to load ${file.name}`);
      }
    } catch (error) {
      setError(`Error loading ${file.name}`);
      console.error('Failed to load file content:', error);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化修改时间
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  useEffect(() => {
    loadFiles(recursive);
  }, [recursive]);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">动态文件加载器</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={() => setRecursive(!recursive)}
            startContent={<Icon icon="solar:folder-with-files-bold" width={16} />}
          >
            {recursive ? '递归模式' : '普通模式'}
          </Button>
          <Button
            size="sm"
            variant="flat"
            onPress={() => loadFiles(recursive)}
            startContent={<Icon icon="solar:refresh-bold" width={16} />}
            isLoading={loading}
          >
            刷新
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardBody>
            <p className="text-red-600">{error}</p>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-2">
          {files.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-center text-gray-500">没有找到 txt 文件</p>
              </CardBody>
            </Card>
          ) : (
            files.map((file) => (
              <Card
                key={file.name}
                isPressable
                onPress={() => loadFileContent(file)}
                className="hover:bg-gray-50 transition-colors"
              >
                <CardHeader className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:file-text-bold" width={20} className="text-blue-500" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                  <Chip size="sm" variant="flat">
                    {formatFileSize(file.size)}
                  </Chip>
                </CardHeader>
                <CardBody className="pt-0">
                  <p className="text-sm text-gray-500">
                    修改时间: {formatDate(file.modified)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    路径: {file.path}
                  </p>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>• 点击文件卡片加载文件内容</p>
        <p>• 递归模式会搜索子文件夹中的 txt 文件</p>
        <p>• 文件按名称排序显示</p>
      </div>
    </div>
  );
}
