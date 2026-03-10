// Interfaz para la forma del error 
export interface IHttpError {
    status?: number;
    code?: string;
    message?: string;
    msg?: { message?: string };
    // Angular HttpErrorResponse puts the parsed server response body here
    error?: { message?: string | string[]; error?: string; statusCode?: number } | any;
};

// Interfaz para el objeto de error que lanzamos
export interface IErrorPayload {
    message: string;
    originalError: IHttpError;
};