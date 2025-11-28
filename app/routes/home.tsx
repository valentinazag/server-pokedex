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

function Card({
  pokemon,
  isCaptured,
}: {
  pokemon: Pokemon;
  isCaptured: boolean;
}) {
  const { name, sprites, types } = pokemon;
  return (
    <div className="cardpokemon">
      <h2>{name}</h2>
      <img src={sprites.front_default} alt="pokemon" />
      <p className="type">
        {types
          .map((type) => {
            return type.type.name;
          })
          .join(",")}
      </p>

      <Form method="POST">
        <input type="hidden" name="pokemonId" value={pokemon.id} />
        {isCaptured ? (
          <button type="submit" name="intent" value={INTENT.SET_RELEASE}>
            release
          </button>
        ) : (
          <button type="submit" name="intent" value={INTENT.SET_CAPTURE}>
            capture
          </button>
        )}
      </Form>
    </div>
  );
}

function Filter({ types }: { types: string[] }) {
  return (
    <Form method="POST">
      <input type="text" name="name" placeholder="filter pokemon" />
      <select name="type" id="">
        <option value="">All types</option>
        {types.map((type) => {
          return (
            <option key={type} value={type}>
              {type}
            </option>
          );
        })}
      </select>
      {/* using `useFetcher` from react router, submit this form without
          needing a submit button */}
      <button type="submit" name="intent" value={INTENT.SET_FILTERS}>
        Filter pokemons
      </button>
    </Form>
  );
}

const INTENT = {
  SET_CAPTURE: "set_capture",
  SET_RELEASE: "set_release",
  SET_FILTERS: "set_filters",
};

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case INTENT.SET_CAPTURE: {
      const pokemonId = v.parse(v.string(), formData.get("pokemonId"));
      const url = new URL(request.url);
      const capturedPokemons = url.searchParams.get("capturedPokemons");
      const capturedPokemonsIds = capturedPokemons
        ? // TODO: strictly verify the returning value of "JSON.parse"
          JSON.parse(capturedPokemons)
        : [];
      capturedPokemonsIds.push(pokemonId);
      url.searchParams.set(
        "capturedPokemons",
        JSON.stringify(capturedPokemonsIds),
      );
      return redirect(url.toString());
    }
    case INTENT.SET_RELEASE: {
      const pokemonId = v.parse(v.string(), formData.get("pokemonId"));
      const url = new URL(request.url);
      const capturedPokemons = url.searchParams.get("capturedPokemons");
      const capturedPokemonsSaved = capturedPokemons
        ? // TODO: strictly verify the returning value of "JSON.parse"
          JSON.parse(capturedPokemons)
        : [];

      const capturatedPokemonIds = capturedPokemonsSaved.filter(
        (saveId: string) => {
          return saveId !== pokemonId;
        },
      );
      url.searchParams.set(
        "capturedPokemons",
        JSON.stringify(capturatedPokemonIds),
      );
      return redirect(url.toString());
    }
    case INTENT.SET_FILTERS: {
      const filterName = v.parse(v.string(), formData.get("name"));
      const filterType = v.parse(v.string(), formData.get("type"));
      const url = new URL(request.url);
      if (filterName) {
        url.searchParams.set("name", filterName);
      } else {
        url.searchParams.delete("name");
      }
      if (filterType) {
        url.searchParams.set("type", filterType);
      } else {
        url.searchParams.delete("type");
      }
      url.searchParams.delete("intent");
      return redirect(url.toString());
    }
  }
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

  const filterTypes = [
    ...new Set(
      pokemons.flatMap((pokemon) =>
        pokemon.types.map((type) => {
          return type.type.name;
        }),
      ),
    ),
  ];

  const url = new URL(request.url);
  const capturedPokemons = url.searchParams.get("capturedPokemons");
  const capturedPokemonsIds = capturedPokemons
    ? // TODO: strictly verify the returning value of "JSON.parse"
      JSON.parse(capturedPokemons).map(Number)
    : [];
  const name = url.searchParams.get("name");
  const type = url.searchParams.get("type");

  // TODO: prefer using "pure" array functions instead of
  // reasigning a variable's value
  let filteredPokemons = pokemons;
  if (name) {
    filteredPokemons = filteredPokemons.filter((pokemon) => {
      return pokemon.name.toLocaleLowerCase().includes(name);
    });
  }
  if (type) {
    filteredPokemons = filteredPokemons.filter((pokemon) => {
      return pokemon.types.some((pokemonsType) => {
        return pokemonsType.type.name === type;
      });
    });
  }

  return { pokemons: filteredPokemons, capturedPokemonsIds, filterTypes };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { pokemons, capturedPokemonsIds, filterTypes } = loaderData;
  const capturedPokemons = pokemons.filter((pokemons) => {
    return capturedPokemonsIds.includes(pokemons.id);
  });

  return (
    <div className="pokedex">
      <div className="filtersPokemons">
        <Filter types={filterTypes} />
      </div>
      <div className="list-pokemon">
        <h1>Pokedex</h1>
        {pokemons.map((pokemon) => {
          return (
            <Card
              key={pokemon.id}
              pokemon={pokemon}
              isCaptured={capturedPokemonsIds.includes(pokemon.id)}
            />
          );
        })}
      </div>
      <div className="list-captured">
        <h1>Captured</h1>
        {capturedPokemons.map((pokemon) => {
          return <Card key={pokemon.id} pokemon={pokemon} isCaptured={true} />;
        })}
      </div>
    </div>
  );
}
