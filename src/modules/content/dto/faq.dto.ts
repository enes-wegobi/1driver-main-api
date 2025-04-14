import { ApiProperty } from '@nestjs/swagger';

export class FaqItemDto {
  @ApiProperty({
    description: 'The question',
    example: 'How do I reset my password?',
  })
  question: string;

  @ApiProperty({
    description: 'The answer to the question',
    example: 'You can reset your password by clicking on the "Forgot Password" link on the login page.',
  })
  answer: string;
}
