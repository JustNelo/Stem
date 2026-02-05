/**
 * Builds an AI prompt string based on the command type, note text, and optional user args.
 */
export function buildAIPrompt(command: string, text: string, args?: string): string {
  switch (command) {
    case "summarize":
      return `Résume ce texte de manière concise:\n\n${text}`;
    case "translate":
      return `Traduis ce texte en anglais:\n\n${text}`;
    case "correct":
      return `Corrige l'orthographe et la grammaire de ce texte, retourne uniquement le texte corrigé:\n\n${text}`;
    case "explain":
      return `Explique ce texte de manière simple et accessible:\n\n${text}`;
    case "ideas":
      return `Génère 5 idées créatives basées sur ce texte:\n\n${text}`;
    case "tags":
      return `Suggère 5 tags pertinents pour catégoriser ce texte (retourne uniquement les tags séparés par des virgules):\n\n${text}`;
    case "ask":
      return `Tu es un assistant intelligent. L'utilisateur travaille sur une note dont voici le contenu:\n\n---\n${text}\n---\n\nL'utilisateur te pose cette question: "${args}"\n\nRéponds de manière utile et concise à sa question. Si la question n'a pas de rapport avec la note, réponds quand même du mieux possible.`;
    default:
      return `${args || "Analyse ce texte"}:\n\n${text}`;
  }
}
