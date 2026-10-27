// frontend/js/images.js — справочник изображений ресторанов.
// Все пути относительные, файлы лежат в frontend/images/.

const RESTAURANT_IMAGES = {
  "Пушкинъ": "images/pushkin.jpg",
  "White Rabbit": "images/white-rabbit.jpg",
  "Турандот": "images/turandot.jpg",
  "Марио": "images/mario.jpg",
  "Nobu": "images/nobu.jpg",
  "Фаренгейт": "images/farengeit.jpg",
  "Erwin.РекаМореОкеан": "images/erwin.jpg",
  "Мама Тао": "images/mama-tao.jpg",
  "Self Edge Japanese": "images/self-edge.jpg",
  "Северяне": "images/severyane.jpg"
};

const PLACEHOLDER_IMAGE = "images/placeholder.jpg";

function getRestaurantImage(name) {
  return RESTAURANT_IMAGES[name] || PLACEHOLDER_IMAGE;
}