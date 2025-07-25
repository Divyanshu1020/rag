import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import {  messages } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { rateLimitForPreviousChatMessages } from '@/lib/redis';


  
export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const key = `ratelimit:previous-chat-messages:${userId}`;
    const { success } = await rateLimitForPreviousChatMessages.limit(key);
    if (!success) {
      return NextResponse.json({ error: "Rate limit exceeded " }, { status: 429 });
    }
    const chatMessages = await db.select().from(messages).where(eq(messages.chatId, params.chatId)).orderBy(asc(messages.createdAt));

    if (!chatMessages) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(chatMessages, { status: 200 });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}