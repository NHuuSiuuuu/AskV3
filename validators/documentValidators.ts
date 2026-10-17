import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z
    .string({ error: "title phải là chuỗi." })
    .trim()
    .min(1, { error: "title không được để trống." }),
  docType: z.string({ error: "docType phải là chuỗi." }),
  issuedDate: z.string({
    error: "issuedDate phải là ngày hợp lệ theo định dạng YYYY-MM-DD.",
  }),
  uploaded_by: z.string({ error: "uploaded_by phải là chuỗi." }),
});
