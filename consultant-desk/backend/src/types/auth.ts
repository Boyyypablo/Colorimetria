export type DeskConsultant = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type DeskConsultantRecord = DeskConsultant & {
  passwordHash: string;
};

declare module "fastify" {
  interface FastifyRequest {
    consultant?: DeskConsultant;
  }
}
