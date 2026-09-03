/**
 * Shared types for matchmaking compatibility system
 */

export type MatchAnswer = {
  qId: string;
  /**
   * For single-choice questions: number (index in options array)
   * For rankTop3 questions: number[] (ordered list of 3 indices, most preferred first)
   */
  myAnswer: number | number[];
  importance: 0 | 1 | 2; // 0=not important, 1=somewhat important, 2=very important
};
