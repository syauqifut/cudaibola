import {
  IdentityValidationError,
  registerOrUpdateNickname,
} from '@/lib/server/identity/service';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Format request tidak valid.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('userId' in body) ||
    !('nickname' in body) ||
    typeof body.userId !== 'string' ||
    typeof body.nickname !== 'string'
  ) {
    return Response.json(
      { error: 'userId dan nickname wajib diisi.' },
      { status: 400 },
    );
  }

  try {
    const user = await registerOrUpdateNickname({
      userId: body.userId,
      nickname: body.nickname,
    });

    return Response.json({
      id: user.id,
      nickname: user.nickname,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof IdentityValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error('[api/users]', error);
    return Response.json(
      { error: 'Gagal menyimpan nickname. Coba lagi.' },
      { status: 500 },
    );
  }
}
