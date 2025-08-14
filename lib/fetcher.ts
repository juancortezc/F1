export interface FetcherError extends Error {
  status: number;
  info: any;
}

export const fetcher = async (url: string): Promise<any> => {
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = new Error('API request failed') as FetcherError;
    error.status = response.status;
    
    try {
      error.info = await response.json();
    } catch {
      error.info = { error: 'Failed to parse error response' };
    }
    
    throw error;
  }
  
  return response.json();
};

export const swrConfig = {
  fetcher,
  onError: (error: FetcherError) => {
    console.error('SWR Error:', error);
    if (error.status === 401) {
      console.warn('Unauthorized request detected');
    }
  },
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error: FetcherError) => {
    return error.status !== 503 && error.status !== 401;
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
};