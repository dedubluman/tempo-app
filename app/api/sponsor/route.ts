import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const sponsorUrl = process.env.NEXT_PUBLIC_FEE_SPONSOR_URL || 'https://sponsor.moderato.tempo.xyz';
    
    const response = await fetch(sponsorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fee sponsorship unavailable, try again' },
      { status: 503 }
    );
  }
}
