import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Bet from '@/models/Bet';

export async function GET() {
  try {
    await dbConnect();
    const bets = await Bet.find({}).sort({ date: -1 });
    return NextResponse.json({ success: true, data: bets });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Se receber um array, insere vários (usado pela extensão)
    if (Array.isArray(body)) {
      const bets = await Bet.insertMany(body);
      return NextResponse.json({ success: true, data: bets });
    } 
    // Se receber um único objeto, insere um só (usado pelo form manual)
    else {
      const bet = await Bet.create(body);
      return NextResponse.json({ success: true, data: bet });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
