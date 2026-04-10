export type QuestionHelperAiFlow = 'wills' | 'incorporation' | 'general';

export type QuestionHelperAiStep =
  | 'profile'
  | 'personalProfile'
  | 'family'
  | 'executors'
  | 'beneficiaries'
  | 'assets'
  | 'guardians'
  | 'poa'
  | 'funeral'
  | 'prior-wills'
  | 'priorWills'
  | 'review'
  | 'general'
  | 'unknown'
  | 'incorporation'
  | 'jurisdiction'
  | 'directors'
  | 'shareholders'
  | 'shares'
  | 'company'
  | 'preIncorporation';

export type QuestionHelperPrimitiveValue = string | number | boolean | null;

