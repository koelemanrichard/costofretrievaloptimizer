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
     * Helper method to extract JSON using bracket matching.
     * Works for both arrays ([...]) and objects ({...}).
     */
    private extractJsonWithBracketMatching(text: string, startIndex: number, openChar: string, closeChar: string): string | null {
        let depth = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = startIndex; i < text.length; i++) {
            const char = text[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\' && inString) {
                escapeNext = true;
                continue;
            }

            if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === openChar) depth++;
                if (char === closeChar) depth--;

                if (depth === 0) {
                    const candidate = text.substring(startIndex, i + 1);
                    try {
                        JSON.parse(candidate);
                        return candidate;
                    } catch {
                        return null;
                    }
                }
            }
        }
        return null;
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

        // Remove BOM (Byte Order Mark) if present - this can cause JSON.parse to fail
        let cleanedText = rawText;
        if (cleanedText.charCodeAt(0) === 0xFEFF) {
            cleanedText = cleanedText.substring(1);
            this.log('Removed BOM from response.', {}, 'info');
        }

        // Remove control characters (except newline, tab, carriage return) that could corrupt JSON
        // eslint-disable-next-line no-control-regex
        const controlCharMatch = cleanedText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
        if (controlCharMatch) {
            // eslint-disable-next-line no-control-regex
            cleanedText = cleanedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
            this.log(`Removed ${controlCharMatch.length} control characters from response.`, {}, 'info');
        }

        const trimmedText = cleanedText.trim();

        // Try to extract from markdown code block first (```json ... ``` or ``` ... ```)
        // Use greedy match to get all content between opening and closing backticks
        const markdownMatch = trimmedText.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
        if (markdownMatch && markdownMatch[1]) {
            this.log('Extracted JSON from markdown code block (exact match).', {}, 'info');
            return markdownMatch[1].trim();
        }

        // Fallback: Try less strict markdown extraction (content might have trailing text after ```)
        const markdownFallback = trimmedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (markdownFallback && markdownFallback[1]) {
            this.log('Extracted JSON from markdown code block (fallback).', {}, 'info');
            return markdownFallback[1].trim();
        }

        // Manual fallback: If response starts with ```json, strip it manually
        if (trimmedText.startsWith('```json') || trimmedText.startsWith('```')) {
            let content = trimmedText;
            // Remove opening ```json or ```
            content = content.replace(/^```(?:json)?\s*\n?/, '');
            // Remove closing ``` and anything after it (Claude sometimes adds notes after)
            content = content.replace(/\n?```[\s\S]*$/, '');
            if (content && content.trim().startsWith('{')) {
                this.log('Extracted JSON by manually stripping markdown backticks.', {}, 'info');
                return content.trim();
            }
        }

        // IMPORTANT: Try to extract JSON ARRAY first (before objects) using bracket matching
        // This ensures arrays are properly extracted when prompts request them
        const firstBracketIndex = trimmedText.indexOf('[');
        const firstBraceIndex = trimmedText.indexOf('{');

        // If array starts before object (or no object exists), try array extraction first
        if (firstBracketIndex !== -1 && (firstBraceIndex === -1 || firstBracketIndex < firstBraceIndex)) {
            const arrayResult = this.extractJsonWithBracketMatching(trimmedText, firstBracketIndex, '[', ']');
            if (arrayResult) {
                this.log('Extracted JSON array from response text.', { extracted: arrayResult.substring(0, 200) + '...' }, 'info');
                return arrayResult;
            }
        }

        // Try to find JSON object using first/last brace positions
        if (trimmedText.includes('{') && trimmedText.includes('}')) {
            const startIdx = trimmedText.indexOf('{');
            const endIdx = trimmedText.lastIndexOf('}');
            if (startIdx !== -1 && endIdx > startIdx) {
                const candidate = trimmedText.substring(startIdx, endIdx + 1);
                try {
                    JSON.parse(candidate);
                    this.log('Extracted JSON using first/last brace positions.', {}, 'info');
                    return candidate;
                } catch {
                    // Continue
                }
            }
        }

        // Try to find JSON object using bracket matching
        if (firstBraceIndex !== -1) {
            const objectResult = this.extractJsonWithBracketMatching(trimmedText, firstBraceIndex, '{', '}');
            if (objectResult) {
                this.log('Extracted JSON object from response text.', { extracted: objectResult.substring(0, 200) + '...' }, 'info');
                return objectResult;
            }
        }

        // Fallback: Try array extraction using first/last bracket positions
        if (firstBracketIndex !== -1) {
            const lastBracketIndex = trimmedText.lastIndexOf(']');
            if (lastBracketIndex > firstBracketIndex) {
                const candidate = trimmedText.substring(firstBracketIndex, lastBracketIndex + 1);
                try {
                    JSON.parse(candidate);
                    this.log('Extracted JSON array using first/last bracket positions.', { extracted: candidate.substring(0, 200) + '...' }, 'info');
                    return candidate;
                } catch {
                    // Continue
                }
            }
        }

        // Log a preview of what we're trying to parse if it doesn't look like JSON
        if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
            const cleanPreview = trimmedText.substring(0, 300).replace(/\n/g, ' ').replace(/\s+/g, ' ');
            this.log(`Response does not appear to be JSON. First 300 chars: "${cleanPreview}"`, {}, 'warning');
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
                const errorMsg = error instanceof Error ? error.message : String(error);
                // Log more context to help debug - include error details in message
                const firstChars = jsonString.substring(0, 100).replace(/\n/g, ' ');
                const lastChars = jsonString.substring(Math.max(0, jsonString.length - 100)).replace(/\n/g, ' ');
                this.log(`JSON parsing error: ${errorMsg}. Length: ${jsonString.length}. First 100: "${firstChars}" ... Last 100: "${lastChars}"`, {}, 'failure');

                // Try to repair truncated JSON
                if (errorMsg.includes('end of') || errorMsg.includes('Unexpected end') ||
                    errorMsg.includes('Unterminated string') || !jsonString.trim().endsWith('}')) {
                    this.log('Attempting to repair potentially truncated JSON...', {}, 'info');

                    // Count open braces/brackets and track if we're inside a string
                    let openBraces = 0;
                    let openBrackets = 0;
                    let inString = false;
                    let escapeNext = false;

                    for (const char of jsonString) {
                        if (escapeNext) { escapeNext = false; continue; }
                        if (char === '\\' && inString) { escapeNext = true; continue; }
                        if (char === '"' && !escapeNext) { inString = !inString; continue; }
                        if (!inString) {
                            if (char === '{') openBraces++;
                            if (char === '}') openBraces--;
                            if (char === '[') openBrackets++;
                            if (char === ']') openBrackets--;
                        }
                    }

                    if (openBraces > 0 || openBrackets > 0 || inString) {
                        let repaired = jsonString.trim();

                        // If we're inside an unterminated string, close it first
                        if (inString) {
                            // Remove any trailing incomplete content after last complete property
                            // Look for last complete key-value pair pattern
                            const lastCompleteMatch = repaired.match(/^([\s\S]*"[^"]*":\s*(?:"[^"]*"|[\d.]+|true|false|null|\{[^{}]*\}|\[[^\[\]]*\]))\s*,?\s*"[^"]*$/);
                            if (lastCompleteMatch) {
                                repaired = lastCompleteMatch[1];
                                this.log('Trimmed incomplete final property from JSON.', {}, 'info');
                            } else {
                                // Just close the string - may lose the incomplete item but structure will be valid
                                repaired += '"';
                                this.log('Closed unterminated string in JSON.', {}, 'info');
                            }
                            // Recount after modification
                            openBraces = 0;
                            openBrackets = 0;
                            inString = false;
                            escapeNext = false;
                            for (const char of repaired) {
                                if (escapeNext) { escapeNext = false; continue; }
                                if (char === '\\' && inString) { escapeNext = true; continue; }
                                if (char === '"' && !escapeNext) { inString = !inString; continue; }
                                if (!inString) {
                                    if (char === '{') openBraces++;
                                    if (char === '}') openBraces--;
                                    if (char === '[') openBrackets++;
                                    if (char === ']') openBrackets--;
                                }
                            }
                        }

                        // Close any open arrays first, then objects
                        for (let i = 0; i < openBrackets; i++) repaired += ']';
                        for (let i = 0; i < openBraces; i++) repaired += '}';

                        try {
                            parsedJson = JSON.parse(repaired);
                            this.log(`Repaired truncated JSON by closing string and adding ${openBrackets} ] and ${openBraces} }`, {}, 'info');
                        } catch (repairError) {
                            this.log('JSON repair failed. Using fallback.', {}, 'failure');
                            return fallback;
                        }
                    } else {
                        return fallback;
                    }
                } else {
                    return fallback;
                }
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
