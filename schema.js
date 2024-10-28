const z = require("zod")

const upiIdRegex = /^[a-zA-Z0-9._]{3,}@[a-zA-Z]{2,}$/;
const MAX_FILE_SIZE = 5000000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const customerSchema = z.object({
  name: z.string(),
  email: z.string().email("Enter proper email."),
  phone: z.number().min(6000000000, "Enter proper mobile number.").max(9999999999, "Enter proper mobile number."),
  password: z.string().max(20, "Passwod should not be that long").min(5, "Password should atleast be 5 characters long.")
});

const staffSchema = z.object({
  storeId: z.string().length(8, "Enter proper Store ID."),
  name: z.string(),
  email: z.string().email("Enter proper email."),
  aadhaar: z.number().min(100000000000, "Enter proper Aadhaar number.").max(999999999999, "Enter proper Aadhaar number."),
  upi: z.string().regex(upiIdRegex, {
    message: 'Invalid UPI ID format.',
  }),
  dob: z.string(),
  gender: z.enum(['Male', 'Female', 'Other']),
  number: z.number().min(6000000000, "Enter proper mobile number.").max(9999999999, "Enter proper mobile number."),
  password: z.string().max(20, "Passwod should not be that long").min(5, "Password should atleast be 5 characters long.")
})

const storeSchema = z.object({
  name: z.string(),
  address: z.string(),
  ownerName: z.string(),
  ownerDob: z.string(),
  ownerGender: z.enum(['Male', 'Female', 'Other']),
  email: z.string().email("Enter proper email."),
  ownerPhone: z.number().min(6000000000, "Enter proper mobile number.").max(9999999999, "Enter proper mobile number."),
  ownerAadhaar: z.number().min(100000000000, "Enter proper Aadhaar number.").max(999999999999, "Enter proper Aadhaar number."),
  ownerUpi: z.string().regex(upiIdRegex, {
    message: 'Invalid UPI ID format.',
  }),
  password: z.string().max(20, "Passwod should not be that long").min(5, "Password should atleast be 5 characters long.")
})

module.exports = { customerSchema, staffSchema, storeSchema };