import { boolean, integer, numeric, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './_shared';
import { productOrigenEnum } from './enums';

export const products = pgTable('products', {
  id: id(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  brand: text('brand'),
  origen: productOrigenEnum('origen').notNull().default('VE'),
  // Modo de envío para origen CN: 'Aéreo' | 'Marítimo' (null para VE).
  modoEnvio: text('modo_envio'),
  stock: integer('stock').notNull().default(0),
  stockMin: integer('stock_min').notNull().default(0),

  // Costos: numeric(12,2) para montos, numeric(5,2) para porcentajes.
  costoBase: numeric('costo_base', { precision: 12, scale: 2 }).notNull().default('0'),
  ivaPct: numeric('iva_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  retencionIvaPct: numeric('retencion_iva_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  envioInterno: numeric('envio_interno', { precision: 12, scale: 2 }).notNull().default('0'),
  envioNacional: numeric('envio_nacional', { precision: 12, scale: 2 }).notNull().default('0'),
  envioAereo: numeric('envio_aereo', { precision: 12, scale: 2 }).notNull().default('0'),
  envioMaritimo: numeric('envio_maritimo', { precision: 12, scale: 2 }).notNull().default('0'),
  costosAduaneros: numeric('costos_aduaneros', { precision: 12, scale: 2 }).notNull().default('0'),
  costosDesconsolidacion: numeric('costos_desconsolidacion', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  costosAdministrativos: numeric('costos_administrativos', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  impuestoNacionalizacion: numeric('impuesto_nacionalizacion', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  costoLiberacion: numeric('costo_liberacion', { precision: 12, scale: 2 }).notNull().default('0'),
  costoAgenteAduanal: numeric('costo_agente_aduanal', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  costosAlmacenamiento: numeric('costos_almacenamiento', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  costoTotal: numeric('costo_total', { precision: 12, scale: 2 }),

  descripcion: text('descripcion'),
  linkCompra: text('link_compra'),
  comoAdquirir: text('como_adquirir'),
  imageUrl: text('image_url'),

  // Proveedor inlined (era un dict en Mongo). Si crece, sacar a tabla aparte.
  proveedorNombre: text('proveedor_nombre'),
  proveedorDireccion: text('proveedor_direccion'),
  proveedorTelefono: text('proveedor_telefono'),
  proveedorEmail: text('proveedor_email'),

  tags: text('tags').array(),
  activo: boolean('activo').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
