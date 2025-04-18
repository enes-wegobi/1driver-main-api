import { ApiProperty } from '@nestjs/swagger';

export class QuestionAnswerDto {
  @ApiProperty({
    description: 'The question',
    example: 'How do I reset my password?',
  })
  question: string;

  @ApiProperty({
    description: 'The answer to the question',
    example:
      'You can reset your password by clicking on the "Forgot Password" link on the login page.',
  })
  answer: string;
}

export class FaqItemDto {
  @ApiProperty({
    description: 'The title of the FAQ section',
    example: 'Account Management',
  })
  title: string;

  @ApiProperty({
    description: 'Array of questions and answers',
    type: [QuestionAnswerDto],
  })
  items: QuestionAnswerDto[];
}
