import { Injectable } from '@nestjs/common';
import { FaqItemDto, QuestionAnswerDto } from './dto/faq.dto';

@Injectable()
export class ContentService {
  private readonly faqs: FaqItemDto[] = [
    {
      title: 'Account Management',
      items: [
        {
          question: 'How do I create an account?',
          answer:
            'You can create an account by clicking on the "Sign Up" button on the homepage and following the registration process. You will need to provide your email, phone number, and create a password.',
        },
        {
          question: 'How can I reset my password?',
          answer:
            'To reset your password, click on the "Forgot Password" link on the login page. You will receive a one-time password (OTP) on your registered email or phone number. Enter the OTP and create a new password.',
        },
      ],
    },
    {
      title: 'Profile Management',
      items: [
        {
          question: 'How do I update my contact information?',
          answer:
            'You can update your contact information by going to your profile settings. For email updates, use the "Initiate Email Update" option. For phone updates, use the "Initiate Phone Update" option. Both processes require OTP verification for security.',
        },
        {
          question: 'How do I add a new address to my profile?',
          answer:
            'To add a new address, go to your profile and select "Addresses". Click on "Add New Address" and fill in the required information such as street address, city, postal code, and country. Save the changes to add the address to your profile.',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          question: 'What should I do if I encounter a technical issue?',
          answer:
            'If you encounter any technical issues, please contact our support team through the "Help & Support" section in the app or website. Alternatively, you can email us at support@example.com with details of the issue you are experiencing.',
        },
      ],
    },
  ];

  getFaqs(): FaqItemDto[] {
    return this.faqs;
  }
}
