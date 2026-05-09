import { NextResponse } from 'next/server';

type UnknownError = {
  message?: unknown;
  name?: unknown;
};

export const getErrorMetadata = (error: unknown) => {
  const err = (error && typeof error === 'object' ? error : {}) as UnknownError;
  return {
    message: typeof err.message === 'string' ? err.message : '',
    name: typeof err.name === 'string' ? err.name : '',
  };
};

export const getDatabaseErrorResponse = (error: unknown) => {
  const { message, name } = getErrorMetadata(error);

  if (message.includes('MongoDB URI is not configured')) {
    return NextResponse.json(
      { error: 'Server database is not configured. Contact support.' },
      { status: 500 }
    );
  }

  if (
    name === 'MongooseServerSelectionError' ||
    message.includes('ECONNREFUSED') ||
    message.includes('querySrv') ||
    message.includes('ENOTFOUND') ||
    message.includes('authentication failed')
  ) {
    return NextResponse.json(
      { error: 'Unable to connect to database. Please try again shortly.' },
      { status: 503 }
    );
  }

  return null;
};
