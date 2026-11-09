type Props = { className?: string };

const ARISH_MAP_EMBED_URL = "https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3090.3823768899147!2d33.779992824945815!3d31.137964865936812!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sar!2seg!4v1794202725173!5m2!1sar!2seg";

export function GoogleArishMap({ className = "" }: Props) {
  return (
    <iframe
      title="خريطة مدينة العريش - تاكسي العاصمة"
      src={ARISH_MAP_EMBED_URL}
      width="600"
      height="450"
      className={`h-full min-h-[280px] w-full border-0 ${className}`}
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
