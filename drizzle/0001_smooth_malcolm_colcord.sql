CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(20) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_label_unique" UNIQUE("label")
);
--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "season_id" uuid;
--> statement-breakpoint
INSERT INTO "seasons" ("id", "label", "start_date", "end_date")
SELECT
	gen_random_uuid(),
	quarters.year::text || ' Q' || quarters.quarter::text,
	timezone('UTC', make_timestamptz(quarters.year, quarters.start_month, 1, 0, 0, 0, 'Asia/Jakarta'))::timestamp,
	timezone('UTC', (
		make_timestamptz(quarters.year, quarters.end_month, 1, 0, 0, 0, 'Asia/Jakarta')
		+ interval '1 month'
		- interval '1 second'
	))::timestamp
FROM (
	SELECT DISTINCT
		EXTRACT(YEAR FROM ((p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int AS year,
		EXTRACT(QUARTER FROM ((p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int AS quarter,
		CASE EXTRACT(QUARTER FROM ((p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int
			WHEN 1 THEN 1
			WHEN 2 THEN 4
			WHEN 3 THEN 7
			WHEN 4 THEN 10
		END AS start_month,
		CASE EXTRACT(QUARTER FROM ((p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int
			WHEN 1 THEN 3
			WHEN 2 THEN 6
			WHEN 3 THEN 9
			WHEN 4 THEN 12
		END AS end_month
	FROM "predictions" p
) AS quarters;
--> statement-breakpoint
UPDATE "predictions" p
SET "season_id" = s.id
FROM "seasons" s
WHERE s.label = (
	EXTRACT(YEAR FROM ((p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int::text
	|| ' Q'
	|| EXTRACT(QUARTER FROM ((p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int::text
);
--> statement-breakpoint
ALTER TABLE "predictions" ALTER COLUMN "season_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;
