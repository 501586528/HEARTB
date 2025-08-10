import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { storyName, chapters } = await request.json();
    
    if (!storyName || !chapters || !Array.isArray(chapters)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request data' 
      }, { status: 400 });
    }

    // 确保 public/story 目录存在
    const storyDir = join(process.cwd(), 'public', 'story');
    if (!existsSync(storyDir)) {
      await mkdir(storyDir, { recursive: true });
    }

    let storyContent = '';
    chapters.forEach((chapter: any) => {
      storyContent += `${chapter.title}\n${chapter.content}\n\n`;
    });

    const fileName = `${storyName.replace(/\.[^/.]+$/, '')}.txt`;
    const filePath = join(storyDir, fileName);
    
    await writeFile(filePath, storyContent, 'utf8');

    return NextResponse.json({ 
      success: true, 
      message: 'Story saved successfully',
      fileName: fileName,
      path: `/story/${fileName}`
    });
  } catch (error) {
    console.error('Error saving story:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save story' 
    }, { status: 500 });
  }
}
