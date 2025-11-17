import { Form, redirect } from "react-router";
import * as v from "valibot";
import type { Route } from "./+types/home";
import "app/app.css";

const PokemonSchema = v.object({
  id: v.number(),
  name: v.string(),
  sprites: v.object({
    front_default: v.string(),
  }),
  types: v.array(
    v.object({
      type: v.object({
        name: v.string(),
      }),
    }),
  ),
});

type Pokemon = v.InferOutput<typeof PokemonSchema>;

const PokemonsSchema = v.object({
  url: v.string(),
});

export async function action({ request }: Route.LoaderArgs) {
  console.log("hola");
}

export async function loader({ request }: Route.LoaderArgs) {
  const AMOUNT = 10;
  const response = await fetch(
    `https://pokeapi.co/api/v2/pokemon?limit=${AMOUNT}&offset=0`,
  );
  const data = await response.json();
  const parsed = v.parse(v.array(PokemonsSchema), data.results);
  const pokemons = await Promise.all(
    parsed.map(async (parsedPokemon) => {
      const responsePokemon = await fetch(parsedPokemon.url);
      const dataPokemon = await responsePokemon.json();
      const validatePokemon = v.parse(PokemonSchema, dataPokemon);
      return validatePokemon;
    }),
  );
  return { pokemons };
}

function Card({ pokemon }: { pokemon: Pokemon }) {
  const { name, sprites, types } = pokemon;
  return (
    <div className="cardpokemon">
      <h2>{name}</h2>
      <img src={sprites.front_default} alt="pokemon" />
      <p className="type">{types.map((type) => type.type.name).join(", ")}</p>
      <button type="button" onClick={() => console.log("hola")}>
        capture
      </button>
    </div>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { pokemons } = loaderData;
  return (
    <div className="pokedex">
      <div className="list-pokemon">
        <h1>Pokedex</h1>
        {pokemons.map((pokemon) => (
          <Card key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>
      <div className="list-captured">
        <h1>Captured</h1>
      </div>
    </div>
  );
}
