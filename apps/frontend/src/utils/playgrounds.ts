import { playgrounds } from "../data/playgrounds";

export function getPlaygroundById(
    id: string
) {
    return playgrounds.find(
        (playground) => playground.id === id
    );
}