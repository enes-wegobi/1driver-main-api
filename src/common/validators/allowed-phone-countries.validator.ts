import { ValidatorConstraint, ValidatorConstraintInterface, ValidationOptions, registerDecorator } from 'class-validator';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

@ValidatorConstraint({ name: 'allowedPhoneCountries', async: false })
export class AllowedPhoneCountriesConstraint implements ValidatorConstraintInterface {
  private readonly allowedCountryCodes = [
    '+90',  // Turkey
    '+91',  // India
    '+92',  // Pakistan
    '+966', // Saudi Arabia
    '+880', // Bangladesh
    '+63',  // Philippines
    '+44',  // United Kingdom
    '+20',  // Egypt
    '+7',   // Russia
    '+86',  // China
    '+968', // Oman
    '+98',  // Iran
    '+94',  // Sri Lanka
    '+977', // Nepal
    '+971',
    '+1',   // United States
    '+49',  // Germany
    '+962', // Jordan
    '+974', // Qatar
    '+965', // Kuwait
    '+973', // Bahrain
    '+33',  // France
  ];

  validate(phone: string) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }

    // First check if it's a valid phone number format
    if (!isValidPhoneNumber(phone)) {
      return false;
    }

    // Check if phone starts with any of the allowed country codes
    return this.allowedCountryCodes.some(code => phone.startsWith(code));
  }

  defaultMessage() {
    return 'Phone number must be valid and start with one of the allowed country codes: +90, +91, +92, +966, +880, +63, +44, +20, +7, +86, +968, +98, +94, +977, +1, +49, +962, +974, +965, +973, +33';
  }
}

export function IsAllowedPhoneCountry(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: AllowedPhoneCountriesConstraint,
    });
  };
}