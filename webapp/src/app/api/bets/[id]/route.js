import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Bet from '@/models/Bet';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    await Bet.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
