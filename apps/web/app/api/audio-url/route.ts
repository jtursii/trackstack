import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const s3Key = request.nextUrl.searchParams.get('s3_key')
  if (!s3Key) {
    return NextResponse.json({ error: 'Missing s3_key parameter' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Keys are scoped to the requesting user: {userId}/{projectId}/{commitId}/{filename}
  // Reject any key that doesn't start with this user's ID to prevent enumeration.
  if (!s3Key.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase.storage
    .from('wav-files')
    .createSignedUrl(s3Key, 3600)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
