/*Este servicio se encarga de interceptar y manejar errores HTTP dentro de flujos RxJS. 
Su objetivo es mejorar la experiencia del usuario mostrando mensajes amigables mediante SweetAlert 
y mantener el flujo de datos consistente lanzando errores tipados.
Este servicio aplica buenas prácticas como:

Uso de operadores RxJS: Permite integrar el manejo de errores directamente en los flujos de datos.
Tipado estricto: Uso de interfaces para asegurar consistencia en los errores.
Desacoplamiento de lógica de presentación: El servicio no depende de componentes específicos.
Mensajes personalizados: Mejora la experiencia del usuario final.
*/

// Importación de decoradores y funciones necesarias de Angular y RxJS
import { inject, Injectable } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs'; 

// Servicio personalizado para mostrar alertas con SweetAlert
import { SweetAlertService } from '../../../../shared';


// Interfaces para tipado estricto de errores HTTP
import { IHttpError, IErrorPayload } from './interfaces'; 

// Diccionario de mensajes de error predefinidos según código
const ERROR_MESSAGES: { [key: string]: string } = {
  'Unauthorized': 'Por favor, inicia sesión para continuar',
  'default': 'Error interno del servidor',
};

/**
 * Servicio encargado de manejar errores HTTP en flujos RxJS.
 * Utiliza SweetAlert para mostrar mensajes amigables al usuario.
 * Se inyecta como singleton en toda la aplicación.
 */
@Injectable ( { providedIn: 'root' } )
export class HttpErrorHandlerService {

  private readonly sweetAlertService = inject ( SweetAlertService );

  /**
   * Devuelve un operador RxJS para manejar errores HTTP en flujos observables.
   * Este operador intercepta errores, muestra una alerta al usuario,
   * y lanza un nuevo error tipado para que el flujo pueda manejarlo adecuadamente.
   * 
   * @returns Función que recibe un Observable<T> y devuelve un Observable<T> con manejo de errores.
   */
  public handleHttpError<T>(): ( source: Observable<T> ) => Observable<T> {

    return catchError ( ( error: IHttpError ): Observable<T> => {
      
      // Extrae el código de error desde el objeto recibido
      const errorCode = error.code?.toString( ).toLowerCase( ) || error.status?.toString( ) || '';

      // Extract the backend's actual message from the response body (error.error)
      // Angular's HttpErrorResponse puts the parsed JSON body in the `error` property.
      // The NestJS exception filter returns: { statusCode, message, error, ... }
      const backendMessage = error.error?.message;
      const backendMessageStr = Array.isArray(backendMessage)
        ? backendMessage.join(', ')
        : backendMessage;

      // Determina el mensaje a mostrar al usuario
      const message = backendMessageStr || error.msg?.message || ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['default'];

      // Muestra una alerta específica si el error es de autenticación
      if (message === 'Unauthorized' || error.status === 401) {
        this.sweetAlertService.simpleFireAlertLogin();
      } else {
        // Muestra una alerta genérica para otros errores
        this.sweetAlertService.simpleFireAlert('center', 'error', message, true);
      }

      /**
       * Lanza un nuevo error tipado como IErrorPayload.
       */
      return throwError ( ( ) => ( { message, originalError: error } as IErrorPayload ) ) as Observable<T>;

    });

  }
}
