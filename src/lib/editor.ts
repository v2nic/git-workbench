import { EditorConfig } from '@/types/config'

export function generateEditorUrl(editorConfig: EditorConfig, filePath: string): string {
  const encodedPath = encodeURIComponent(filePath)
  
  if (editorConfig.openCommand) {
    // Custom command template with {path} placeholder
    return editorConfig.openCommand.replace('{path}', encodedPath)
  }
  
  // Default scheme-based URL
  return `${editorConfig.scheme}://file/${encodedPath}`
}
