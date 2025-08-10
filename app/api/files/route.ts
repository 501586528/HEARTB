import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

// 递归获取文件夹中的所有 txt 文件
async function getAllTxtFiles(dirPath: string, recursive: boolean = false): Promise<any[]> {
  const files = await readdir(dirPath);
  const txtFiles = [];

  for (const file of files) {
    const filePath = join(dirPath, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory() && recursive) {
      // 递归获取子文件夹中的文件
      const subFiles = await getAllTxtFiles(filePath, recursive);
      txtFiles.push(...subFiles);
    } else if (file.endsWith('.txt')) {
      // 获取相对路径用于前端访问
      const relativePath = filePath.replace(process.cwd(), '').replace(/\\/g, '/');
      // 确保路径以 / 开头，并且移除 /public 前缀（因为 Next.js 静态文件服务从 public 开始）
      const publicPath = relativePath.replace('/public', '');
      txtFiles.push({
        name: file,
        size: fileStat.size,
        path: publicPath,
        fullPath: filePath,
        modified: fileStat.mtime
      });
    }
  }

  return txtFiles;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recursive = searchParams.get('recursive') === 'true';
    const folder = searchParams.get('folder') || 'story';
    
    const dirPath = join(process.cwd(), folder);
    
    // 检查文件夹是否存在
    try {
      await stat(dirPath);
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: `Folder '${folder}' not found` 
      }, { status: 404 });
    }

    const txtFiles = await getAllTxtFiles(dirPath, recursive);
    
    // 按文件名排序
    txtFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({ 
      success: true, 
      files: txtFiles,
      count: txtFiles.length,
      folder: folder,
      recursive: recursive
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to read directory' 
    }, { status: 500 });
  }
}
