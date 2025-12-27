"use server";

import { NextResponse } from 'next/server';
import { searchVisualMediaAction } from '@/lib/actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const type = (searchParams.get('type') as 'video' | 'image') || 'image';
  const userId = searchParams.get('userId') || '';

  if (!query.trim() || !userId) {
    return NextResponse.json({ error: 'Missing query or userId' }, { status: 400 });
  }

  try {
    const results = await searchVisualMediaAction({ query, mediaType: type, userId });
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch media';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
