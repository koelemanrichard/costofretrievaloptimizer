// FIX: Corrected import path to be a relative path.
import { GenerationLogEntry } from '../types';
// FIX: Corrected import path to be a relative path.
import { AppAction } from '../state/appState';
import React from 'react';

// A type guard to check if an object is a plain object
const isObject = (obj: any): obj is Record<string, any> => {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
};

export class AIResponseSanitizer {
    private dispatch: React.Dispatch<AppAction>;

    constructor(dispatch: React.Dispatch<AppAction>) {
        this.dispatch = dispatch;
    }

    private log(message: string, data: any, status: GenerationLogEntry['status'] = 'skipped') {
        this.dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'AIResponseSanitizer',
                message,
                status,
                data,
                timestamp: Date.now()
            }
        });
    }

    /**
     * Extracts a JSON string from a raw AI response, which might be wrapped in markdown.
     * @param rawText The raw text from the AI.
     * @returns The cleaned JSON string.
     */
    private extractJsonString(rawText: string): string {
        if (!rawText || typeof rawText !== 'string') {
            this.log('Received empty or non-string response from AI.', { rawText });
            return '';
        }

        const trimmedText = rawText.trim();
        const match = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        
        if (match && match[1]) {
            this.log('Extracted JSON from markdown code block.', { original: rawText, extracted: match[1] }, 'info');
            return match[1].trim();
        }
        
        return trimmedText;
    }

    /**
     * Safely parses a JSON string and recursively validates its structure against an expected schema.
     * This function is highly defensive and aims to return a usable object even if the AI response is malformed.
     * @param rawResponse The raw string response from the AI.
     * @param expectedSchema An object representing the desired structure. Keys are property names, values are the expected type constructor (e.g., Array, String) or a nested schema object.
     * @param fallback A fallback value with a matching structure to return if validation fails.
     * @returns A sanitized object that matches the schema as closely as possible, or the fallback value.
     */
    public sanitize<T extends object>(rawResponse: string | object, expectedSchema: Record<string, any>, fallback: T): T {
        let parsedJson: any;

        if (typeof rawResponse === 'string') {
            const jsonString = this.extractJsonString(rawResponse);
            if (!jsonString) {
                this.log('Sanitization failed: Extracted JSON string is empty.', { rawResponse });
                return fallback;
            }
            try {
                parsedJson = JSON.parse(jsonString);
            } catch (error) {
                this.log('Sanitization failed: JSON parsing error.', { jsonString, error: error instanceof Error ? error.message : String(error) });
                return fallback;
            }
        } else {
            parsedJson = rawResponse;
        }


        if (!isObject(parsedJson)) {
            if (Array.isArray(fallback) && Array.isArray(parsedJson)) {
                return parsedJson as T;
            }
            this.log('Sanitization failed: Parsed data is not an object as expected.', { parsedJson });
            return fallback;
        }
        
        const sanitizedObject: Partial<T> = {};

        for (const key in expectedSchema) {
            const expectedTypeOrSchema = expectedSchema[key];
            const receivedValue = parsedJson[key];
            const keyTyped = key as keyof T;
            const fallbackValue = fallback[keyTyped];

            if (receivedValue === undefined || receivedValue === null) {
                this.log(`Key "${key}" was missing in AI response. Using default.`, { parsedJson });
                sanitizedObject[keyTyped] = fallbackValue;
                continue;
            }
            
            // FIX: Implemented recursive validation for nested objects. The type assertions below are necessary
            // to satisfy TypeScript's strict generic constraints during recursion. The `isObject()`
            // checks ensure these assertions are safe.
            if (isObject(expectedTypeOrSchema)) {
                if (isObject(receivedValue) && isObject(fallbackValue)) {
                    sanitizedObject[keyTyped] = this.sanitize(
                        receivedValue as Record<string, any>,
                        expectedTypeOrSchema,
                        fallbackValue as Record<string, any>
                    ) as T[keyof T];
                } else {
                    this.log(`Key "${key}" was not a valid object as expected by the nested schema. Using default.`, { receivedValue });
                    sanitizedObject[keyTyped] = fallbackValue;
                }
            } else if (expectedTypeOrSchema === Array && !Array.isArray(receivedValue)) {
                this.log(`Key "${key}" was not an array as expected. Using default.`, { receivedValue });
                sanitizedObject[keyTyped] = fallbackValue;
            } else if (expectedTypeOrSchema === String && typeof receivedValue !== 'string') {
                 this.log(`Key "${key}" was not a string as expected. Coercing to string.`, { receivedValue });
                 sanitizedObject[keyTyped] = String(receivedValue) as any;
            } else if (expectedTypeOrSchema === Number && typeof receivedValue !== 'number') {
                 this.log(`Key "${key}" was not a number as expected. Using default.`, { receivedValue });
                 sanitizedObject[keyTyped] = fallbackValue;
            } else {
                 sanitizedObject[keyTyped] = receivedValue;
            }
        }
        
        // Ensure all keys from fallback are present if they were missed
        for (const key in fallback) {
            if (!(key in sanitizedObject)) {
                sanitizedObject[key as keyof T] = fallback[key as keyof T];
            }
        }

        this.log('Sanitization successful.', { rawResponse, sanitized: sanitizedObject }, 'info');
        return sanitizedObject as T;
    }

    /**
     * A simpler version for when the expected output is just an array.
     */
    public sanitizeArray<T>(rawResponse: string, fallback: T[] = []): T[] {
        const jsonString = this.extractJsonString(rawResponse);
        if (!jsonString) {
            this.log('Sanitization (Array) failed: Extracted JSON string is empty.', { rawResponse });
            return fallback;
        }

        let parsedJson: any;
        try {
            parsedJson = JSON.parse(jsonString);
        } catch (error) {
            this.log('Sanitization (Array) failed: JSON parsing error.', { jsonString, error: error instanceof Error ? error.message : String(error) });
            return fallback;
        }

        if (Array.isArray(parsedJson)) {
             this.log('Sanitization (Array) successful.', { rawResponse, sanitized: parsedJson }, 'info');
            return parsedJson;
        }

        if(isObject(parsedJson)) {
            // Check if it's an object with a single key that is an array
            const keys = Object.keys(parsedJson);
            if(keys.length === 1 && Array.isArray(parsedJson[keys[0]])){
                this.log(`AI returned object instead of array. Extracting array from key "${keys[0]}".`, { parsedJson });
                return parsedJson[keys[0]];
            }
        }

        this.log('Sanitization (Array) failed: Expected an array but received something else. Wrapping in array.', { parsedJson });
        return [parsedJson].filter(Boolean); // Filter out potential null/undefined after wrapping
    }
}
