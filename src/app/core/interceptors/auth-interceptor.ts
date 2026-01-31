import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/TokenService/token-service';
import { environment } from '../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);

  // Check if the request is for the n8n chatbot - skip auth logic
  if (req.url.includes('n8n.cloud')) {
    return next(req);
  }

  // Clone the request and add headers
  const clonedReq = req.clone({
    setHeaders: {
      // Add Authorization header if token exists
      ...(tokenService.getToken() && {
        'Authorization': `Bearer ${tokenService.getToken()}`
      }),
      // Always add Device ID header
      'X-Device-Id': environment.deviceId
    }
  });

  // Debug logging
  if (!environment.production) {
    console.log('🔐 Auth Interceptor:', {
      url: req.url,
      hasToken: !!tokenService.getToken(),
      deviceId: environment.deviceId,
      headers: clonedReq.headers.keys()
    });
  }

  return next(clonedReq);
};
